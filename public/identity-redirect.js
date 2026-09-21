// Netlify Identity mails (invite / recovery / confirmation) always land on the
// site root, which is the game — and the game has no login widget. Forward those
// links to /admin/ with the hash intact so the widget there can pick them up.
(function () {
  var h = window.location.hash || "";
  if (!/^#(invite_token|recovery_token|confirmation_token|email_change_token)=/.test(h)) return;
  if (/\/admin\/?$/.test(window.location.pathname)) return;
  window.location.replace("/admin/" + h);
})();
