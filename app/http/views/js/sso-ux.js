/**
 * User sign-in/sign-on for Webmaker.org apps
 */
(function setupUIHandler(window, document, $) {

  // make sure jQuery is available to us
  if(!$) {
    var jq = document.createElement("script");
    jq.src = "{{ hostname }}/js/ext/jquery-1.9.1.min.js";
    jq.onload = function() {
      // retry, this time in the knowledge that we have jQuery
      setupUIHandler(window, document, window.jQuery);
    };
    document.head.appendChild(jq);
    return;
  }

  // SSO UI handling object
  var ui =  {
    displayLogin: function(userData) {
      var placeHolder = $("#identity"),
          userElement = $('div.user-name');
      if (userData) {
        placeHolder.html('<a href="{{ hostname }}/account">' + userData.name + '</a>');
        placeHolder.before("<img src='https://secure.gravatar.com/avatar/" + userData.hash + "?s=26&d=http%3A%2F%2Fstuff.webmaker.org%2Favatars%2Fwebmaker-avatar-44x44.png' alt='" + userData.hash + "'>");
      } else {
        userElement.html("<span id='identity'></span>");
      }
    },
    newMaker: function(loggedInUser, formAnchor, callback) {
      /**
       * load in HTML include containing the HTML form
       * display form
       * munge values into form
       * attach submit handlers to the form
       * AJAX post to createMaker API
       * remove form and listeners once everything is sorted
       */

      var $formContainer,
          $formFrag;

      if ( !errMsg ) {
        $(".row.error-message").html("");
      }

      $formContainer = $(".webmaker-create-user", formAnchor);
      if ( !$formContainer.length ) {
        $.get("{{ hostname }}/ajax/forms/new_user.html", function(html) {
          $formContainer = $(html).appendTo( $("#webmaker-nav"));
          $formContainer.slideDown();
          $formFrag = $("#sso_create", formAnchor );
          $mailSignUp = $('#bsd');
          $formFrag.submit( function(data) {
            if( $mailSignUp.is(':checked') ) {
              $.ajax({
                type: 'POST',
                url: 'https://sendto.mozilla.org/page/s/webmaker',
                data: {
                  email: $('#username').val(),
                  'custom-1216': 1
                },
                success: function(resp) {
                  return true;
                },
                error: function(resp) {
                  return false;
                }
              });
            }

            $.ajax({
              type: "POST",
              url: "{{ hostname }}/user",
              headers: {
                "X-CSRF-Token": csrfMeta.content
              },
              dataType: "json",
              data: {
                "_id": loggedInUser,
                "email": loggedInUser,
                "username": $('#username').val()
              },
              success: function(resp) {
                ui.existingMaker({
                  name: resp.user.username,
                  hash: resp.user.emailHash
                });
                $formContainer.slideUp();
                callback(null, loggedInUser, resp.user.username);
              },
              error: function(resp) {
                callback(JSON.parse(resp.responseText).error, $('#username').val());
                return false;
              }
            });
            return false;
          });
        });
      } else {
        $formContainer.slideDown();
      }
    },
    existingMaker: function(userData) {
      /**
       * API call to the getUserData API
       * display logged in user data in the UI (where to be defined)
       */
      ui.displayLogin(userData);
    },
    loggedOut: function() {
      /**
       * remove logged in user data from the UI
       * remove any listeners we have attached
       */
      ui.displayLogin();
      $(".webmaker-create-user").slideUp();
    }
  };

  // Set up the 'my makes' functionality.
  var makes = $("#webmaker-nav .my-projects-container"),
      makeButton = $("#webmaker-nav .makes button").click(function() {
        makes.toggleClass("open");
      });

  // Window level control over updating the iframe when a consumer
  // app knows that the publications have changed and need to be
  // refreshed:
  window.userBar = window.userBar || {
    updateMakes: function() {
      var iframe = $("iframe",makes)[0];
      iframe.src = iframe.src;
    }
  };

  // User-defined login/logout handling
  var noop = function(){};
  navigator.idSSO.app = navigator.idSSO.app || {};
  navigator.idSSO.app.onlogin = navigator.idSSO.app.onlogin || noop;
  navigator.idSSO.app.onlogout = navigator.idSSO.app.onlogout || noop;


  // Which button do we show?
  var emailMeta = document.querySelector("meta[name='persona-email']"),
      cookieEmail = emailMeta.content ? emailMeta.content : "",
      loggedIn = !!cookieEmail,
      csrfMeta = document.querySelector("meta[name='X-CSRF-Token']"),
      errMsg;

  // Start listening for Persona events
  navigator.idSSO.watch({
    // Note: 'loggedInUser:cookieEmail' yet, see https://bugzilla.mozilla.org/show_bug.cgi?id=872710
    onlogin: function(assertion) {
      $.ajax({
        type: 'POST',
        url: '/persona/verify',
        headers: {
          "X-CSRF-Token": csrfMeta.content
        },
        data: {assertion: assertion},
        success: function(res, status, xhr) {
          // login succeeded, show this user as logged in
          // and call the on-page onlogin handler.
          ui.existingMaker({
            name: res.user.username,
            hash: res.user.emailHash
          });
          $("#webmaker-nav iframe.include-frame").addClass("loggedin");
          $('body').addClass("loggedin");
          navigator.idSSO.app.onlogin(res.email, res.user.username, res.user);
        },
        error: function(xhr, status, err) {
          var error = JSON.parse(xhr.responseText);

          function newMaker (err, loggedInUser, displayName) {
            // hook-out to the owning page, so that it can perform a
            // webmaker-loginAPI lookup, allowing it to bind the user's
            // email and webmaker ID in its req.session.[...]
            if (err) {
              errMsg = err;
              // Username existed
              if (err.code === 11000) {
                $(".row.error-message").html("Another user has already claimed <strong>" + loggedInUser + "</strong>!");
                ui.newMaker(error.email, $("#webmaker-nav"), newMaker);
                return;
              }
              return navigator.idSSO.logout();
            }
            $.ajax({
              type: 'POST',
              url: "/persona/verify",
              headers: {
                "X-CSRF-Token": csrfMeta.content
              },
              data: {assertion: assertion},
              success: function(res, status, xhr) {
                // login succeeded, show this user as logged in
                // and call the on-page onlogin handler.
                errMsg = null;
                $("#webmaker-nav iframe.include-frame").addClass("loggedin");
                $('body').addClass("loggedin");
                navigator.idSSO.app.onlogin(loggedInUser, displayName, res.user);
              },
              error: function(xhr, status, err) {
                errMsg = err;
                navigator.idSSO.logout();
              }
            });
          }

          if(xhr.status === 404 && error.status === "failure") {
            ui.newMaker(error.email, $("#webmaker-nav"), newMaker);
          } else {
            errMsg = err;
            navigator.idSSO.logout();
          }
        }
      });
    },
    onlogout: function() {
      ui.loggedOut();
      makes.removeClass("open");
      $('body').removeClass("loggedin");
      $("#webmaker-nav iframe.include-frame").removeClass("loggedin");
      // make sure the page does whatever it needs to,
      navigator.idSSO.app.onlogout(errMsg);
      errMsg = null;
      // and make sure the app knows we're logged out.
      $.ajax({
        type: "POST",
        url: "/persona/logout",
        headers: {
          "X-CSRF-Token": csrfMeta.content
        },
        async: true
      });
    }
  });

}(window, document, window.jQuery));
