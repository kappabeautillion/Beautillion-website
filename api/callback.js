// Vercel serverless function: completes the GitHub OAuth flow for Decap CMS.
// Exchanges the temporary `code` for an access token, then hands the token
// back to the Decap CMS popup window using the protocol Decap expects.

module.exports = async (req, res) => {
  const clientId = process.env.OAUTH_CLIENT_ID;
  const clientSecret = process.env.OAUTH_CLIENT_SECRET;
  const code = req.query && req.query.code;

  if (!clientId || !clientSecret) {
    res.status(500).send("Missing OAUTH_CLIENT_ID / OAUTH_CLIENT_SECRET environment variables. See README.md.");
    return;
  }
  if (!code) {
    res.status(400).send(renderMessage("error", "Missing authorization code from GitHub."));
    return;
  }

  try {
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code }),
    });
    const tokenData = await tokenRes.json();

    if (tokenData.error) {
      res.status(400).send(renderMessage("error", tokenData.error_description || tokenData.error));
      return;
    }

    res.setHeader("Content-Type", "text/html");
    res.status(200).send(renderMessage("success", JSON.stringify({ token: tokenData.access_token, provider: "github" })));
  } catch (err) {
    res.status(500).send(renderMessage("error", "Unexpected error completing GitHub sign-in."));
  }
};

function renderMessage(status, content) {
  // This is the postMessage handshake Decap CMS's external OAuth client expects:
  // the popup waits for the opener (the /admin page) to announce it's listening,
  // then replies once with the final success/error payload.
  const safeContent = String(content).replace(/</g, "&lt;");
  return `<!doctype html>
<html><body>
<script>
  (function() {
    function receiveMessage(e) {
      window.opener.postMessage(
        'authorization:github:${status}:${safeContent}',
        e.origin
      );
      window.removeEventListener("message", receiveMessage, false);
    }
    window.addEventListener("message", receiveMessage, false);
    window.opener.postMessage("authorizing:github", "*");
  })();
</script>
<p>${status === "success" ? "Signed in — you can close this window." : "Sign-in failed: " + safeContent}</p>
</body></html>`;
}
