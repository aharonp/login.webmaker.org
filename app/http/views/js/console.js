(function() {
  // Cache config
  var loginUri = "{{ hostname }}";

  // Cache jQuery references
  var jQuery = {
        users: $( "#users" ),
        _id: $( "#_id" ),
        email: $( "#email" ),
        username: $( "#username" ),
        fullname: $( "#fullname" ),
        isAdmin: $( "#isAdmin" ),
        isSuspended: $( "#isSuspended" ),
        sendNotifications: $( "#sendNotifications" ),
        sendEngagements: $( "#sendEngagements" ),
        newUser: $( "#newUser" ),
        submit: $( "#submit" ),
        clear: $( "#clear" ),
        emailError: $( "#email-error" ),
        usernameError: $( "#username-error" ),
        fullnameError: $( "#fullname-error" )
      };

  /**
   * Ajax helper
   * Expects: { 
   *   uri: loginAPI endpoing,
   *   method: GET/POST/PUT/DELETE,
   *   data: {},
   *   error: function ( xhr, status, error ) 
   *   success: function ( data, status, xhr )
   * }
   **/
  var ajaxHelper = function ( options ){
    var defaults = {
      success: function( data, status, xhr ) {
        console.log( "Safestate: Success, data is ", data );
      },
      error: function( xhr, status, error ) {
        console.log( "Safestate: Error is ", error );
      }
    };

    // Parse arguments
    options = options || {};
    if ( !options.uri ) {
      // Error case
      return console.log( "No URL passed to ajaxHelper" );
    }  
    options.method = options.method || "get";
    options.data = options.data || {};
    options.success = options.success || defaults.success;
    options.error = options.error || defaults.error;
 

    $.ajax({
      url: options.uri,
      method: options.method,
      data: options.data,
      error: options.error,
      success: options.success
    });
  }; // END AJAX-HELPER  

  /**
   * DOM Manipulation helper
   **/
  var domHelper = {
    clearForm: function() {
      jQuery._id.prop( "value", "");
      jQuery.email.prop( "value", "");
      jQuery.username.prop( "value", "");
      jQuery.fullname.prop( "value", "");
      jQuery.isAdmin.prop( "checked", "");
      jQuery.isSuspended.prop( "checked", "");
      jQuery.sendNotifications.prop( "checked", "");
      jQuery.sendEngagements.prop( "checked", "");
      jQuery.newUser.prop( "value", "true");

      // Reset validation
      valid = false;
    },
    deleteUser: function ( id ) {
      // Ask for confirmation
      var goForIt = confirm( "Really delete " + id + "?" );

      if (goForIt) {
        ajaxHelper({
          uri: loginUri + "/user/" + id,
          method: "delete",
          error: function( xhr, status, error ) {
            console.log( "Error deleting: ", xhr.responseText );
          },
          success: function( data, status, xhr ) {
            domHelper.clearForm();
            domHelper.displayUsers();
          }
        });
      } // END-IF
    },
    saveUser: function() {
      // Collect data
      var userData = {};

      userData.email = userData._id = jQuery.email.prop( "value" );
      userData.username = jQuery.username.prop( "value" );
      userData.fullName = jQuery.fullname.prop( "value" );

      userData.isAdmin = jQuery.isAdmin.prop( "checked" ) === false ? false : true;
      userData.isSuspended = jQuery.isSuspended.prop( "checked" ) === false ? false : true;
      userData.sendNotifications = jQuery.sendNotifications.prop( "checked" ) === false ? false : true;
      userData.sendEngagements = jQuery.sendEngagements.prop( "checked" ) === false ? false : true;

      // New user or old?
      var method = jQuery.newUser.attr( "value" ) === "false" ? "put" : "post",
          url = loginUri + ( jQuery.newUser.attr( "value" ) === "false" ? "/user/" + userData.email : "/user" );

      // Ajax call
      ajaxHelper({
        uri: url,
        method: method,
        data: userData,
        error: function ( xhr, status, error ) {
          console.log( "Error! ", xhr.responseText );
          domHelper.clearForm();
        },
        success: function() {
          domHelper.clearForm();
          domHelper.displayUsers();
        }
      });

      // Redisplay page
    },
    editUser: function( username ) {
      // Collect user data
      ajaxHelper( {
        uri: loginUri + "/user/" + username,
        method: "get",
        error: function( xhr, status, error ) {
          console.log( "Error! ", xhr.responseText );
        },  
        success: function( data, status, xhr ) {
        // Populate form with data
          var user = data.user;
         
          // Text boxes
          jQuery._id.prop( "value", user._id);
          jQuery.email.prop( "value", user.email);
          jQuery.username.prop( "value", user.username);
          jQuery.fullname.prop( "value", user.fullName);


          // Checkboxes
          jQuery.isAdmin.prop( "checked", user.isAdmin === true ? true : false);
          jQuery.isSuspended.prop( "checked", user.isSuspended === true ? true : false);
          jQuery.sendNotifications.prop( "checked", user.sendNotifications === true ? true : false);
          jQuery.sendEngagements.prop( "checked", user.sendEngagements === true ? true : false);

          // Hidden field
          jQuery.newUser.prop( "value", "false" );
        }
      });
    },    
    displayUsers: function() { 
      // Set core data
      var error,
          success;

      // Error case handling
      error = function( xhr, status, error ) {
        jQuery.users.empty();
        jQuery.users.append( "<td colspan=\"3\"><h4>" + ( "Users not found, or server error" ) + "</h4></td>" );
      };

      // Success case handling
      success = function( data, status, xhr ) {
        // Unique HTML ID incrementers
        var rowID = 0;

        jQuery.users.empty();
        data.users.forEach( function( user ) {
          rowID++;

          // Add a row
          jQuery.users.append( "<tr>" + 
                               "<th>" + user._id + "</th>" +
                               "<td>" + ( user.isAdmin ? "admin" : "none" ) + "</td>" +
                               "<td><button id=\"" + rowID + "\">" + ( user.isAdmin ? "Remove admin" : "Add admin" ) + "</button></td>" +
                               "<td><button id=\"" + user.username + "\">" + "Edit user" + "</button></td>" +
                               "<td><button id=\"" + user.username + "del" + "\">" + "Delete user" + "</button></td>" +
                               "</tr>" );

          // Bind click events for admin changes
          $( "#" + rowID ).on( 'click', function() {
            ajaxHelper({
              uri: loginUri + "/user/" + user._id,
              method: "put",
              data: { isAdmin: !user.isAdmin },
              error: function( xhr, status, error ) {
                alert("Error! " + error);
              },
              success: function( data, status, xhr ) {
                domHelper.clearForm();
                domHelper.displayUsers();
              }  
            });
          }); // END-BIND

          // Bind click events for edit user          
          $( "#" + user.username ).on( 'click', function() {
            domHelper.editUser( user.username );
          }); // END-BIND

          // Bind click events for delete user
          $( "#" + user.username + "del").on( 'click', function() {
            domHelper.deleteUser( user._id );
          }); // END-BIND
        });
      };

      // Invoke ajax helper
      ajaxHelper( {
        uri: loginUri + "/users",
        method: "get",
        data: {},
        error: error,
        success: success
      });
    }
  };

  /**
   * General event bindings
   **/  

  jQuery.submit.on( 'click', function() {
    domHelper.saveUser();
  });
  jQuery.clear.on( 'click', function() {
    domHelper.clearForm();
  });
  jQuery.clear.on( 'click', function() {
    domHelper.clearForm();
  });
  jQuery.clear.on( 'click', function() {
    domHelper.clearForm();
  });

  /**
   * Control Logic
   **/  

  domHelper.displayUsers();
})();

