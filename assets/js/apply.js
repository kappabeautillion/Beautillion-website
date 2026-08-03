/* =========================================================
   BEAUTILLION LEADERSHIP ACADEMY — APPLICATION ENGINE
   Powers the multi-step /apply/ experience: step navigation,
   repeatable entries, essay word counts, signature pads,
   document upload staging, browser-local autosave, the review
   screen, and submission.

   IMPORTANT — what this file does NOT do, by design, until real
   backend infrastructure exists (see README.md, "Apply Page —
   Next Steps"):
     - It does not create real user accounts or send verification
       emails. "Save and Finish Later" saves progress to this
       browser only (localStorage), not to a server, so it will
       not follow the applicant to a different device.
     - It does not virus-scan uploads or store documents in a
       private, access-controlled location — files are staged in
       the browser and, once Formspree is connected, emailed to
       the Academy the same way the Support and Apply forms
       already work. See README.md before promoting this page
       for real applications.
     - It does not run an admin dashboard or automated reminder
       emails.
   ========================================================= */

(function () {
  "use strict";

  var form = document.getElementById("apply-form-el");
  if (!form) return; // Only run on the /apply/ page.

  var STEPS = [
    { num: 1, label: "Applicant Info" },
    { num: 2, label: "Parent/Guardian" },
    { num: 3, label: "Academics" },
    { num: 4, label: "Activities" },
    { num: 5, label: "College & Career" },
    { num: 6, label: "Short Responses" },
    { num: 7, label: "Documents" },
    { num: 8, label: "Authorizations" },
    { num: 9, label: "Review & Submit" }
  ];

  var current = 1;
  var applyContent = null; // populated from content/apply.json
  var uploadedFiles = {}; // slot key -> File
  var DRAFT_KEY = "beautillion-application-draft-v1";

  /* ---------- Stepper ---------- */
  var stepperEl = document.getElementById("apply-stepper");
  var progressFill = document.getElementById("apply-progress-fill");
  var mobileLabel = document.getElementById("apply-step-label-mobile");

  function renderStepper() {
    stepperEl.innerHTML = STEPS.map(function (s) {
      var cls = "as-step" + (s.num === current ? " active" : "") + (s.num < current ? " complete" : "");
      return '<span class="' + cls + '" data-goto-step="' + s.num + '"><span class="as-num">' + s.num + "</span>" + s.label + "</span>";
    }).join("");
    stepperEl.querySelectorAll("[data-goto-step]").forEach(function (el) {
      el.style.cursor = "pointer";
      el.addEventListener("click", function () {
        var target = parseInt(el.getAttribute("data-goto-step"), 10);
        if (target < current || target === current) goToStep(target);
        else if (target === current + 1) nextStep();
      });
    });
    progressFill.style.width = (current / STEPS.length) * 100 + "%";
    mobileLabel.textContent = "Step " + current + " of " + STEPS.length + ": " + STEPS[current - 1].label;
  }

  function showStep(n) {
    document.querySelectorAll(".apply-step").forEach(function (el) {
      el.classList.toggle("active", parseInt(el.getAttribute("data-step"), 10) === n);
    });
    document.getElementById("apply-back-btn").style.visibility = n === 1 ? "hidden" : "visible";
    document.getElementById("apply-next-btn").style.display = n === STEPS.length ? "none" : "inline-flex";
    document.getElementById("apply-submit-btn").style.display = n === STEPS.length ? "inline-flex" : "none";
    renderStepper();
    window.scrollTo({ top: document.getElementById("apply-shell").offsetTop - 100, behavior: "smooth" });
  }

  function goToStep(n) {
    current = n;
    if (n === STEPS.length) renderReview();
    showStep(n);
  }

  function currentStepEl() {
    return document.querySelector('.apply-step[data-step="' + current + '"]');
  }

  function validateCurrentStep() {
    var stepEl = currentStepEl();
    var invalid = stepEl.querySelector(":invalid");
    if (invalid) {
      invalid.reportValidity();
      return false;
    }
    return true;
  }

  function nextStep() {
    serializeRepeaters();
    if (!validateCurrentStep()) return;
    if (current < STEPS.length) goToStep(current + 1);
  }

  document.getElementById("apply-next-btn").addEventListener("click", nextStep);
  document.getElementById("apply-back-btn").addEventListener("click", function () {
    if (current > 1) goToStep(current - 1);
  });

  /* ---------- Age auto-calculation ---------- */
  var dobInput = document.getElementById("app-dob");
  var ageInput = document.getElementById("app-age");
  if (dobInput) {
    dobInput.addEventListener("change", function () {
      var dob = new Date(dobInput.value);
      if (isNaN(dob.getTime())) return;
      var today = new Date();
      var age = today.getFullYear() - dob.getFullYear();
      var m = today.getMonth() - dob.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
      ageInput.value = age + " years old";
    });
  }

  /* ---------- Guardian "same as applicant" address ---------- */
  function wireSameAddress(checkboxId, prefix) {
    var cb = document.getElementById(checkboxId);
    if (!cb) return;
    cb.addEventListener("change", function () {
      var street = document.getElementById(prefix + "-street");
      var city = document.getElementById(prefix + "-city");
      var state = document.getElementById(prefix + "-state");
      var zip = document.getElementById(prefix + "-zip");
      [street, city, state, zip].forEach(function (el) { if (el) el.readOnly = cb.checked; });
      if (cb.checked) {
        var appStreet = document.getElementById("app-street");
        var appUnit = document.getElementById("app-unit");
        var appCity = document.getElementById("app-city");
        var appState = document.getElementById("app-state");
        var appZip = document.getElementById("app-zip");
        if (street) street.value = (appStreet ? appStreet.value : "") + (appUnit && appUnit.value ? ", " + appUnit.value : "");
        if (city) city.value = appCity ? appCity.value : "";
        if (state) state.value = appState ? appState.value : "";
        if (zip) zip.value = appZip ? appZip.value : "";
      }
    });
  }
  wireSameAddress("g1-same-address", "g1");
  wireSameAddress("g2-same-address", "g2");

  /* ---------- Guardian 2 toggle ---------- */
  var addG2Btn = document.getElementById("add-guardian-2-btn");
  if (addG2Btn) {
    addG2Btn.addEventListener("click", function () {
      document.getElementById("guardian-2-fieldset").style.display = "block";
      addG2Btn.style.display = "none";
    });
  }

  /* ---------- Repeaters (Activities / Service / Employment / Awards) ---------- */
  var REPEATER_FIELDS = {
    activities: [
      { key: "name", label: "Activity or Organization", type: "text" },
      { key: "org", label: "School or Community Organization", type: "text" },
      { key: "role", label: "Position or Leadership Role", type: "text" },
      { key: "dates", label: "Dates of Participation", type: "text" },
      { key: "hours", label: "Average Hours per Month", type: "text" },
      { key: "description", label: "Description", type: "textarea" }
    ],
    service: [
      { key: "org", label: "Organization", type: "text" },
      { key: "type", label: "Type of Service", type: "text" },
      { key: "role", label: "Role", type: "text" },
      { key: "dates", label: "Dates", type: "text" },
      { key: "hours", label: "Approximate Service Hours", type: "text" },
      { key: "description", label: "Description of Impact", type: "textarea" }
    ],
    employment: [
      { key: "employer", label: "Employer", type: "text" },
      { key: "position", label: "Position", type: "text" },
      { key: "dates", label: "Dates Employed", type: "text" },
      { key: "hours", label: "Average Weekly Hours", type: "text" },
      { key: "responsibilities", label: "Responsibilities", type: "textarea" }
    ],
    awards: [
      { key: "title", label: "Award or Honor", type: "text" },
      { key: "year", label: "Year", type: "text" },
      { key: "description", label: "Description", type: "text" }
    ]
  };

  var repeaterCounts = { activities: 0, service: 0, employment: 0, awards: 0 };

  function addRepeaterRow(type, values) {
    var list = document.getElementById(type + "-list");
    var idx = repeaterCounts[type]++;
    var row = document.createElement("div");
    row.className = "repeater-row";
    row.setAttribute("data-repeater-row", type);
    var fieldsHtml = REPEATER_FIELDS[type].map(function (f) {
      var name = type + "_" + idx + "_" + f.key;
      var val = (values && values[f.key]) || "";
      if (f.type === "textarea") {
        return '<div class="field"><label>' + f.label + "</label><textarea data-rkey=\"" + f.key + '" name="' + name + '">' + val.replace(/</g, "&lt;") + "</textarea></div>";
      }
      return '<div class="field"><label>' + f.label + "</label><input data-rkey=\"" + f.key + '" name="' + name + '" type="text" value="' + val.replace(/"/g, "&quot;") + '" /></div>';
    }).join("");
    row.innerHTML =
      '<button type="button" class="repeater-remove">Remove</button>' +
      '<span class="repeater-index">Entry ' + (list.children.length + 1) + "</span>" +
      '<div class="form-row cols-2">' + fieldsHtml + "</div>";
    row.querySelector(".repeater-remove").addEventListener("click", function () {
      row.remove();
      renumberRepeater(type);
    });
    list.appendChild(row);
  }

  function renumberRepeater(type) {
    var list = document.getElementById(type + "-list");
    list.querySelectorAll(".repeater-index").forEach(function (el, i) {
      el.textContent = "Entry " + (i + 1);
    });
  }

  document.querySelectorAll("[data-repeater-add]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      addRepeaterRow(btn.getAttribute("data-repeater-add"));
    });
  });

  function serializeRepeaters() {
    Object.keys(REPEATER_FIELDS).forEach(function (type) {
      var rows = document.querySelectorAll('[data-repeater-row="' + type + '"]');
      var lines = [];
      rows.forEach(function (row, i) {
        var parts = REPEATER_FIELDS[type].map(function (f) {
          var el = row.querySelector('[data-rkey="' + f.key + '"]');
          return f.label + ": " + (el ? el.value : "");
        });
        lines.push((i + 1) + ". " + parts.join(" | "));
      });
      var summaryEl = document.getElementById(type + "-summary");
      if (summaryEl) summaryEl.value = lines.join("\n\n");
    });
  }

  /* ---------- Essay fields (from content/apply.json) ---------- */
  function renderEssays(essays) {
    var container = document.getElementById("essay-fields");
    if (!container || !essays) return;
    container.innerHTML = essays.map(function (e) {
      return (
        '<div class="essay-field" style="margin-bottom:34px;">' +
        '<div class="field-prompt">' + e.label + "</div>" +
        "<p style=\"color:var(--gray-500); font-size:0.9rem; margin-bottom:12px;\">" + e.prompt + "</p>" +
        '<textarea name="' + e.id + '" data-essay-limit="' + e.limit + '"></textarea>' +
        '<span class="word-counter" data-essay-counter>0 / ' + e.limit + " words</span>" +
        "</div>"
      );
    }).join("");
    container.querySelectorAll("textarea[data-essay-limit]").forEach(function (ta) {
      var counter = ta.parentElement.querySelector("[data-essay-counter]");
      var limit = parseInt(ta.getAttribute("data-essay-limit"), 10);
      ta.addEventListener("input", function () {
        var words = ta.value.trim() ? ta.value.trim().split(/\s+/).length : 0;
        counter.textContent = words + " / " + limit + " words";
        counter.classList.toggle("is-over", words > limit);
      });
    });
  }

  /* ---------- Authorizations (from content/apply.json) ---------- */
  function renderAcknowledgements(list, containerId, namePrefix) {
    var container = document.getElementById(containerId);
    if (!container || !list) return;
    container.innerHTML = list.map(function (a, i) {
      return (
        '<div class="checkbox-field"><input type="checkbox" id="' + namePrefix + i + '" name="' + a.id + '" ' + (a.required ? "required" : "") + " />" +
        '<label for="' + namePrefix + i + '">' + a.text + "</label></div>"
      );
    }).join("");
  }

  function renderMediaAuth(media) {
    var container = document.getElementById("media-authorization");
    if (!container || !media) return;
    container.innerHTML =
      '<div class="checkbox-field"><input type="checkbox" id="media-auth-cb" name="media_authorization" ' + (media.required ? "required" : "") + " />" +
      '<label for="media-auth-cb">' + media.text + "</label></div>";
  }

  /* ---------- Signature pads ---------- */
  function setupSignaturePad(canvasId, imageInputId, dateInputId, dateDisplayId) {
    var canvas = document.getElementById(canvasId);
    if (!canvas) return;
    var ctx = canvas.getContext("2d");
    var drawing = false;
    var hasDrawn = false;

    function resizeCanvas() {
      var ratio = window.devicePixelRatio || 1;
      var rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * ratio;
      canvas.height = rect.height * ratio;
      ctx.scale(ratio, ratio);
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.strokeStyle = "#1c1a18";
    }
    resizeCanvas();

    function pos(e) {
      var rect = canvas.getBoundingClientRect();
      var clientX = e.touches ? e.touches[0].clientX : e.clientX;
      var clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return { x: clientX - rect.left, y: clientY - rect.top };
    }
    function start(e) {
      drawing = true;
      hasDrawn = true;
      var p = pos(e);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      e.preventDefault();
    }
    function move(e) {
      if (!drawing) return;
      var p = pos(e);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      e.preventDefault();
    }
    function end() {
      if (!drawing) return;
      drawing = false;
      var img = document.getElementById(imageInputId);
      if (img) img.value = canvas.toDataURL("image/png");
      var dateField = document.getElementById(dateInputId);
      var dateDisplay = document.getElementById(dateDisplayId);
      var today = new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
      if (dateField) dateField.value = today;
      if (dateDisplay) dateDisplay.value = today;
    }
    canvas.addEventListener("mousedown", start);
    canvas.addEventListener("mousemove", move);
    window.addEventListener("mouseup", end);
    canvas.addEventListener("touchstart", start);
    canvas.addEventListener("touchmove", move);
    canvas.addEventListener("touchend", end);

    var clearBtn = document.querySelector('[data-sig-clear="' + (canvasId.indexOf("app-") === 0 ? "app" : "g") + '"]');
    if (clearBtn) {
      clearBtn.addEventListener("click", function () {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        hasDrawn = false;
        var img = document.getElementById(imageInputId);
        if (img) img.value = "";
      });
    }
    return { hasDrawn: function () { return hasDrawn; } };
  }
  var appSigPad = setupSignaturePad("app-sig-canvas", "app-sig-image", "app-sig-date", "app-sig-date-display");
  var gSigPad = setupSignaturePad("g-sig-canvas", "g-sig-image", "g-sig-date", "g-sig-date-display");

  /* ---------- Document upload slots ---------- */
  var ALLOWED_DOC_TYPES = [".pdf", ".doc", ".docx", ".jpg", ".jpeg", ".png"];
  var MAX_DOC_BYTES = 15 * 1024 * 1024;

  function setupUploadSlot(slotEl) {
    var key = slotEl.getAttribute("data-doc-slot");
    var required = slotEl.getAttribute("data-doc-required") === "true";
    var dropzone = document.createElement("div");
    dropzone.className = "upload-dropzone";
    dropzone.tabIndex = 0;
    dropzone.setAttribute("role", "button");
    dropzone.innerHTML =
      '<svg class="upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M12 15V4M12 4l-4 4M12 4l4 4"/><path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/></svg>' +
      '<p><span class="upload-cta">Click to upload</span> or drag and drop</p>' +
      "<p style=\"margin-top:6px;\">PDF, DOC, DOCX, JPG, or PNG — up to 15MB</p>";
    var fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.hidden = true;
    fileInput.name = "doc_" + key;
    fileInput.accept = ALLOWED_DOC_TYPES.join(",");
    var chipHolder = document.createElement("div");
    var errorEl = document.createElement("p");
    errorEl.className = "upload-error";
    slotEl.appendChild(dropzone);
    slotEl.appendChild(fileInput);
    slotEl.appendChild(chipHolder);
    slotEl.appendChild(errorEl);

    function showError(msg) { errorEl.textContent = msg; errorEl.classList.add("is-active"); }
    function clearError() { errorEl.textContent = ""; errorEl.classList.remove("is-active"); }

    function handleFile(file) {
      clearError();
      if (!file) return;
      var ext = "." + file.name.split(".").pop().toLowerCase();
      if (ALLOWED_DOC_TYPES.indexOf(ext) === -1) {
        showError("Unsupported file type. Please upload a PDF, DOC, DOCX, JPG, or PNG.");
        fileInput.value = "";
        delete uploadedFiles[key];
        return;
      }
      if (file.size > MAX_DOC_BYTES) {
        showError("That file is larger than 15MB. Please upload a smaller file.");
        fileInput.value = "";
        delete uploadedFiles[key];
        return;
      }
      uploadedFiles[key] = file;
      chipHolder.innerHTML =
        '<div class="file-chip"><span>' + file.name + " (" + (file.size / (1024 * 1024)).toFixed(1) + ' MB)</span><button type="button" class="file-chip-remove">Remove</button></div>';
      chipHolder.querySelector(".file-chip-remove").addEventListener("click", function () {
        fileInput.value = "";
        chipHolder.innerHTML = "";
        delete uploadedFiles[key];
      });
    }
    dropzone.addEventListener("click", function () { fileInput.click(); });
    dropzone.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileInput.click(); } });
    dropzone.addEventListener("dragover", function (e) { e.preventDefault(); dropzone.classList.add("dragover"); });
    dropzone.addEventListener("dragleave", function () { dropzone.classList.remove("dragover"); });
    dropzone.addEventListener("drop", function (e) {
      e.preventDefault();
      dropzone.classList.remove("dragover");
      if (e.dataTransfer && e.dataTransfer.files[0]) { fileInput.files = e.dataTransfer.files; handleFile(e.dataTransfer.files[0]); }
    });
    fileInput.addEventListener("change", function () { handleFile(fileInput.files[0]); });

    return { required: required, hasFile: function () { return !!uploadedFiles[key]; } };
  }
  var uploadSlots = [];
  document.querySelectorAll("[data-doc-slot]").forEach(function (el) { uploadSlots.push(setupUploadSlot(el)); });

  /* ---------- Review screen ---------- */
  function fieldVal(name) {
    var el = form.querySelector('[name="' + name + '"]');
    if (!el) return "";
    if (el.type === "checkbox") return el.checked ? "Yes" : "No";
    return el.value || "";
  }
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function collectIssues() {
    var issues = [];
    form.querySelectorAll("[required]").forEach(function (el) {
      var visible = el.offsetParent !== null || true; // fields exist even off-step
      if (el.type === "checkbox" && !el.checked) issues.push("Missing required acknowledgement: " + (el.closest(".checkbox-field") ? el.closest(".checkbox-field").textContent.trim() : el.name));
      else if (el.type !== "checkbox" && !el.value) issues.push("Missing required field: " + (el.previousElementSibling && el.previousElementSibling.tagName === "LABEL" ? el.previousElementSibling.textContent : el.name));
    });
    form.querySelectorAll('input[type="email"]').forEach(function (el) {
      if (el.value && !EMAIL_RE.test(el.value)) issues.push("Invalid email address: " + el.value);
    });
    form.querySelectorAll("textarea[data-essay-limit]").forEach(function (ta) {
      var limit = parseInt(ta.getAttribute("data-essay-limit"), 10);
      var words = ta.value.trim() ? ta.value.trim().split(/\s+/).length : 0;
      if (words > limit) issues.push("A short response exceeds its word limit (" + words + " / " + limit + " words).");
    });
    if (!document.getElementById("app-sig-image").value) issues.push("Missing applicant signature.");
    if (!document.getElementById("g-sig-image").value) issues.push("Missing parent/guardian signature.");
    uploadSlots.forEach(function (slot) {
      if (slot.required && !slot.hasFile()) issues.push("Missing required document: transcript.");
    });
    return issues;
  }

  function renderReview() {
    serializeRepeaters();
    var container = document.getElementById("review-container");
    var issues = collectIssues();
    var issuesHtml = issues.length
      ? '<div class="review-issues"><h3>Please review before submitting</h3><ul>' + issues.map(function (i) { return "<li>" + i + "</li>"; }).join("") + "</ul></div>"
      : '<div class="review-ok">Everything looks complete. You can still go back and edit any section before submitting.</div>';

    function section(title, step, rows) {
      return (
        '<div class="review-section"><div class="review-section-head"><h3>' + title + '</h3><button type="button" class="btn-text" data-goto-step="' + step + '">Edit</button></div>' +
        '<div class="review-section-body">' +
        rows.map(function (r) { return '<div class="review-row"><span>' + r[0] + "</span><strong>" + (r[1] || "&mdash;") + "</strong></div>"; }).join("") +
        "</div></div>"
      );
    }

    var html = issuesHtml;
    html += section("Applicant Information", 1, [
      ["Name", [fieldVal("app_legal_first_name"), fieldVal("app_middle_name"), fieldVal("app_last_name"), fieldVal("app_suffix")].filter(Boolean).join(" ")],
      ["Date of Birth", fieldVal("app_dob")],
      ["Address", [fieldVal("app_address_street"), fieldVal("app_city"), fieldVal("app_state"), fieldVal("app_zip")].filter(Boolean).join(", ")],
      ["Email", fieldVal("app_email")],
      ["Phone", fieldVal("app_phone")]
    ]);
    html += section("Parent / Guardian Information", 2, [
      ["Guardian 1", fieldVal("g1_full_name") + (fieldVal("g1_relationship") ? " (" + fieldVal("g1_relationship") + ")" : "")],
      ["Guardian 1 Email", fieldVal("g1_email")],
      ["Guardian 2", fieldVal("g2_full_name") || "Not provided"],
      ["Communications go to", fieldVal("g_comm_recipient")]
    ]);
    html += section("Academic Background", 3, [
      ["High School", fieldVal("edu_school")],
      ["Grade / Graduation Year", fieldVal("edu_grade") + " / " + fieldVal("edu_grad_year")],
      ["GPA", fieldVal("edu_gpa") + (fieldVal("edu_gpa") ? " (" + fieldVal("edu_gpa_scale") + " scale, " + fieldVal("edu_weighted") + ")" : "")],
      ["Counselor", fieldVal("edu_counselor_name")]
    ]);
    html += section("Leadership, Activities & Service", 4, [
      ["Activities Listed", document.querySelectorAll('[data-repeater-row="activities"]').length + " entr" + (document.querySelectorAll('[data-repeater-row="activities"]').length === 1 ? "y" : "ies")],
      ["Service Entries", document.querySelectorAll('[data-repeater-row="service"]').length + " entr" + (document.querySelectorAll('[data-repeater-row="service"]').length === 1 ? "y" : "ies")],
      ["Employment Entries", document.querySelectorAll('[data-repeater-row="employment"]').length + " entr" + (document.querySelectorAll('[data-repeater-row="employment"]').length === 1 ? "y" : "ies")]
    ]);
    html += section("College and Career Interests", 5, [
      ["Intended Major", fieldVal("cc_intended_major")],
      ["Career Aspirations", fieldVal("cc_career_aspirations")]
    ]);
    var essayRows = [];
    form.querySelectorAll("textarea[data-essay-limit]").forEach(function (ta) {
      var words = ta.value.trim() ? ta.value.trim().split(/\s+/).length : 0;
      essayRows.push([ta.previousElementSibling ? "" : "", words + " words"]);
    });
    html += section("Short Responses", 6, [
      ["Responses Completed", form.querySelectorAll("textarea[data-essay-limit]").length + " prompts"]
    ]);
    html += section("Documents", 7, [
      ["Transcript", uploadedFiles.transcript ? uploadedFiles.transcript.name : "Not uploaded"],
      ["Résumé", uploadedFiles.resume ? uploadedFiles.resume.name : "Not provided"],
      ["Recommendation Letter", uploadedFiles.recommendation ? uploadedFiles.recommendation.name : "Not provided"],
      ["Headshot", uploadedFiles.headshot ? uploadedFiles.headshot.name : "Not provided"]
    ]);
    html += section("Authorizations & Signatures", 8, [
      ["Applicant Signature", document.getElementById("app-sig-image").value ? "Signed " + fieldVal("app_signature_date") : "Not signed"],
      ["Guardian Signature", document.getElementById("g-sig-image").value ? "Signed " + fieldVal("g_signature_date") : "Not signed"],
      ["Media Authorization", fieldVal("media_authorization")]
    ]);

    container.innerHTML = html;
    container.querySelectorAll("[data-goto-step]").forEach(function (btn) {
      btn.addEventListener("click", function () { goToStep(parseInt(btn.getAttribute("data-goto-step"), 10)); });
    });
  }

  /* ---------- Autosave (this browser only) ---------- */
  var autosaveNote = document.getElementById("autosave-note");
  var saveTimer = null;

  function serializeForm() {
    var data = { fields: {}, repeaters: {}, currentStep: current };
    form.querySelectorAll("input, textarea, select").forEach(function (el) {
      if (!el.name || el.type === "file") return;
      if (el.type === "checkbox" || el.type === "radio") data.fields[el.name + (el.type === "radio" ? "::" + el.value : "")] = el.checked;
      else data.fields[el.name] = el.value;
    });
    Object.keys(REPEATER_FIELDS).forEach(function (type) {
      data.repeaters[type] = [];
      document.querySelectorAll('[data-repeater-row="' + type + '"]').forEach(function (row) {
        var entry = {};
        REPEATER_FIELDS[type].forEach(function (f) {
          var el = row.querySelector('[data-rkey="' + f.key + '"]');
          entry[f.key] = el ? el.value : "";
        });
        data.repeaters[type].push(entry);
      });
    });
    return data;
  }

  function saveDraft(showNote) {
    serializeRepeaters();
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(serializeForm()));
      if (showNote && autosaveNote) {
        var t = new Date().toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
        autosaveNote.textContent = "Saved at " + t + ".";
        autosaveNote.classList.add("is-saved");
      }
    } catch (e) { /* localStorage unavailable — fail silently */ }
  }

  function restoreDraft() {
    var raw;
    try { raw = localStorage.getItem(DRAFT_KEY); } catch (e) { return; }
    if (!raw) return;
    var data;
    try { data = JSON.parse(raw); } catch (e) { return; }

    Object.keys(data.repeaters || {}).forEach(function (type) {
      data.repeaters[type].forEach(function (entry) { addRepeaterRow(type, entry); });
    });
    Object.keys(data.fields || {}).forEach(function (key) {
      if (key.indexOf("::") > -1) {
        var parts = key.split("::");
        var el = form.querySelector('[name="' + parts[0] + '"][value="' + parts[1] + '"]');
        if (el) el.checked = data.fields[key];
      } else {
        var els = form.querySelectorAll('[name="' + key + '"]');
        els.forEach(function (el) {
          if (el.type === "checkbox") el.checked = data.fields[key];
          else el.value = data.fields[key];
        });
      }
    });
    // Re-trigger dependent UI (age calc, essay counters, guardian 2 visibility)
    if (dobInput && dobInput.value) dobInput.dispatchEvent(new Event("change"));
    if (fieldVal("g2_full_name")) {
      document.getElementById("guardian-2-fieldset").style.display = "block";
      if (addG2Btn) addG2Btn.style.display = "none";
    }
    form.querySelectorAll("textarea[data-essay-limit]").forEach(function (ta) { ta.dispatchEvent(new Event("input")); });

    if (autosaveNote && data.fields) {
      autosaveNote.textContent = "Restored your saved progress from this browser.";
      autosaveNote.classList.add("is-saved");
    }
  }

  form.addEventListener("input", function () {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () { saveDraft(true); }, 1500);
  });

  document.getElementById("apply-save-btn").addEventListener("click", function () {
    saveDraft(true);
    if (autosaveNote) autosaveNote.textContent = "Saved! You can close this tab and pick up where you left off on this device before the deadline.";
  });

  /* ---------- Submit ---------- */
  form.addEventListener("submit", function (e) {
    var issues = collectIssues();
    if (issues.length) {
      e.preventDefault();
      goToStep(STEPS.length);
      return;
    }
    var action = form.getAttribute("action") || "";
    var isConfigured = action.indexOf("formspree.io") > -1 && action.indexOf("YOUR_FORM_ID") === -1;
    var note = document.getElementById("apply-form-note");
    if (!isConfigured) {
      e.preventDefault();
      if (note) {
        note.textContent = "Applications aren't being accepted online yet — see README.md, \"Apply Page — Next Steps.\" Nothing you've entered has been sent anywhere; your progress is still saved in this browser.";
        note.style.color = "#9c140e";
      }
      return;
    }
    e.preventDefault();
    serializeRepeaters();
    var data = new FormData(form);
    Object.keys(uploadedFiles).forEach(function (key) { data.append("doc_" + key, uploadedFiles[key]); });
    fetch(action, { method: "POST", body: data, headers: { Accept: "application/json" } })
      .then(function (res) {
        if (res.ok) showSuccess();
        else throw new Error("submit-failed");
      })
      .catch(function () {
        if (note) note.textContent = "Something went wrong submitting your application. Please email us directly so we don't miss you.";
      });
  });

  function showSuccess() {
    var year = new Date().getFullYear();
    var confNum = "BLA-" + year + "-" + Math.random().toString(36).substr(2, 6).toUpperCase();
    document.getElementById("apply-shell").querySelector(".apply-stepper").style.display = "none";
    document.getElementById("apply-shell").querySelector(".apply-progress-bar").style.display = "none";
    document.getElementById("apply-step-label-mobile").style.display = "none";
    form.style.display = "none";
    var successEl = document.getElementById("apply-success");
    successEl.style.display = "block";
    document.getElementById("confirmation-number").textContent = "Confirmation Number: " + confNum;
    var submittedDate = new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
    document.getElementById("confirmation-summary").innerHTML =
      '<div class="review-row"><span>Applicant</span><strong>' + (fieldVal("app_legal_first_name") + " " + fieldVal("app_last_name")) + "</strong></div>" +
      '<div class="review-row"><span>Application Year</span><strong>' + year + "</strong></div>" +
      '<div class="review-row"><span>Submission Date</span><strong>' + submittedDate + "</strong></div>" +
      '<div class="review-row"><span>Document Status</span><strong>' + (uploadedFiles.transcript ? "Transcript received" : "Transcript pending") + "</strong></div>" +
      '<div class="review-row"><span>Contact Email</span><strong>kappabeautillion@gmail.com</strong></div>';
    try { localStorage.removeItem(DRAFT_KEY); } catch (e) {}
    window.scrollTo({ top: document.getElementById("apply-shell").offsetTop - 100, behavior: "smooth" });
  }

  document.getElementById("download-application-btn").addEventListener("click", function () {
    var text = "Beautillion Leadership Academy — Application Summary\n\n" + document.getElementById("confirmation-summary").innerText;
    var blob = new Blob([text], { type: "text/plain" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "beautillion-application-summary.txt";
    a.click();
  });

  /* ---------- Load CMS content (eligibility text, essays, acknowledgements) ---------- */
  Beautillion.loadContent("/content/apply.json", function (data) {
    applyContent = data;
    if (data.requirements && data.requirements.length) {
      var list = document.getElementById("requirements-checklist");
      if (list) list.innerHTML = data.requirements.map(function (r) { return "<li>" + r + "</li>"; }).join("");
    }
    renderEssays(data.essays);
    renderAcknowledgements(data.applicant_acknowledgements, "applicant-acknowledgements", "ack-a-");
    renderAcknowledgements(data.guardian_acknowledgements, "guardian-acknowledgements", "ack-g-");
    renderMediaAuth(data.media_authorization);
    // Restore any saved draft only after dynamic fields exist to restore into.
    restoreDraft();
  });

  /* ---------- Initial render ---------- */
  showStep(current);
})();
