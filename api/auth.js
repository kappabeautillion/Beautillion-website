// Vercel serverless function: starts the GitHub OAuth flow for Decap CMS.
// No dependencies required — uses Node's built-in fetch/APIs (Node 18+ on Vercel).
//
// Requires two environment variables set in the Vercel project:
//   OAUTH_CLIENT_ID     — from your GitHub OAuth App
//   OAUTH_CLIENT_SECRET — from your GitHub OAuth App
// See README.md, "Setting up committee editing (Decap CMS)".

module.exports = (req, res) => {
  const clientId = process.env.OAUTH_CLIENT_ID;
  if (!clientId) {
    res.status(500).send("Missing OAUTH_CLIENT_ID environment variable. See README.md.");
    return;
  }

  const proto = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const redirectUri = `${proto}://${host}/api/callback`;

  const state = Math.random().toString(36).slice(2);
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: "repo,user",
    state,
  });

  res.writeHead(302, { Location: `https://github.com/login/oauth/authorize?${params.toString()}` });
  res.end();
};
