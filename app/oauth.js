define(function() {
  var signin_button;
  // var revoke_button;
  // var user_info_div;
  var access_token;
  var User = {
    id:'',
    firstname:'',
    familyname:'',
    email:''
  };

  var tokenFetcher = (function() {
    var clientId = 'chromadex.dev1.mygluk.it';
    var clientSecret = "";
    var redirectUri = 'https://' + chrome.runtime.id +
                      '.chromiumapp.org/provider_cb';
    var redirectRe = new RegExp(redirectUri + '[#\?](.*)');
    access_token = null;

    return {
      getToken: function(interactive, callback) {
        // In case we already have an access_token cached, simply return it.
        if (access_token) {
          callback(null, access_token);
          return;
        }

        var options = {
          'interactive': interactive,
          // url:'https://graph.facebook.com/oauth/access_token?client_id=' + clientId +
          url: 'https://glukit.appspot.com/authorize?client_id=' + clientId +
              // '&access_type=online' +
              '&redirectUri=' + encodeURIComponent(redirectUri) + '&response_type=code'
        }
        chrome.identity.launchWebAuthFlow(options, function(redirectUri) {
          if (chrome.runtime.lastError) {
            callback(new Error(chrome.runtime.lastError));
            return;
          }

          // Upon success the response is appended to redirectUri, e.g.
          // https://{app_id}.chromiumapp.org/provider_cb#access_token={value}
          //     &refresh_token={value}
          // or:
          // https://{app_id}.chromiumapp.org/provider_cb#code={value}
          var matches = redirectUri.match(redirectRe);
          debugger;
          if (matches && matches.length > 1)
            handleProviderResponse(parseRedirectFragment(matches[1]));
          else
            callback(new Error('Invalid redirect URI'));
        });

        function parseRedirectFragment(fragment) {
          var pairs = fragment.split(/&/);
          var values = {};

          pairs.forEach(function(pair) {
            var nameval = pair.split(/=/);
            values[nameval[0]] = nameval[1];
          });

          return values;
        }

        function handleProviderResponse(values) {
          if (values.hasOwnProperty('access_token'))
            setAccessToken(values.access_token);
          else if (values.hasOwnProperty('code'))
            exchangeCodeForToken(values.code);
          else callback(new Error('Neither access_token nor code avialable.'));
        }

        function exchangeCodeForToken(code) {
          debugger;
          var xhr = new XMLHttpRequest();
	  var params = 'clientId=' + clientId + 
		       '&client_secret=' + clientSecret +
	               '&redirectUri=' + redirectUri +
		       '&grant_type=authorization_code&code=' + code;
          xhr.open('POST',
                   // 'https://www.facebook.com/dialog/oauth?'+
                   'https://glukit.appspot.com/token');
          xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
	  xhr.setRequestHeader('Content-length', param.length);
          xhr.setRequestHeader('Accept', 'application/json');
          xhr.onload = function () {
            if (this.status === 200) {
              var response = JSON.parse('"'+this.responseText+'"');
              response = response.substring(0,response.indexOf('&'));
              setAccessToken(response);
              access_token = response;
            }
          };
          xhr.send(params);
        }

        function setAccessToken(token) {
          access_token = token;
          callback(null, access_token);
        }
      },

      removeCachedToken: function(token_to_remove) {
        if (access_token == token_to_remove)
          access_token = null;
      }
    }
  })();

  function xhrWithAuth(method, url, interactive, callback) {
    var retry = true;
    getToken();

    function getToken() {
      tokenFetcher.getToken(interactive, function(error, token) {
        if (error) {
          callback(error);
          return;
        }
        access_token = token;
        requestStart();
      });
    }

    function requestStart() {
      var xhr = new XMLHttpRequest();
      xhr.open(method, url);
      xhr.setRequestHeader('Authorization', 'Bearer ' + access_token);
      xhr.onload = requestComplete;
      xhr.send();
    }

    function requestComplete() {
      if (this.status != 200 && retry) {
        retry = false;
        tokenFetcher.removeCachedToken(access_token);
        access_token = null;
        getToken();
      } else {
        callback(null, this.status, this.response);
      }
    }
  }

  function getUserInfo(interactive) {
    xhrWithAuth('GET',
                'https://graph.facebook.com/me?'+access_token,
                interactive,
                onUserInfoFetched);
  }

  // Functions updating the User Interface:

  function showButton(button) {
    button.style.display = 'inline';
    button.disabled = false;
  }

  function hideButton(button) {
    button.style.display = 'none';
  }

  function disableButton(button) {
    button.disabled = true;
  }

  function onUserInfoFetched(error, status, response) {
    if (!error && status == 200) {
      var user_info = JSON.parse(response);
      // console.log("Got the following user info: " + response);
      User.id = user_info.id;
      User.firstname = user_info.first_name;
      User.familyname = user_info.last_name;
      User.email = user_info.email;
      console.log(User);
      document.getElementById('user_info').innerHTML = 
      "<b>Hello " + User.firstname + " " + User.familyname + "</b><br>"
            + "Your email is: " + User.email + "</b><br>" + 
            "Link to your Facebook page is:" + user_info.link;
      hideButton(signin_button);
      // showButton(revoke_button);
    } else {
      showButton(signin_button);
    }
  }

  function interactiveSignIn() {
    return new Promise(function(success, fail) {
      tokenFetcher.getToken(true, function(error, access_token) {
        if (error) {
          fail();
        } else {
          success(access_token);
        }
      });
    });
  }

  // function revokeToken() {
    // We are opening the web page that allows user to revoke their token.
    // window.open('https://github.com/settings/applications');
    // user_info_div.textContent = '';
    // hideButton(revoke_button);
    // showButton(signin_button);
  // }

  return {
    interactiveSignIn: interactiveSignIn,
    tokenFetcher: tokenFetcher
  };
});
