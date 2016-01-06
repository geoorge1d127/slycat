/* app.js */
console.log( "loaded" );

require(["jquery", "URI"], function($, URI)
{
  function login()
  {
    user_name = b64EncodeUnicode(document.getElementById("Username").value)
    password = b64EncodeUnicode(document.getElementById("Password").value)
    //TODO: add post call for username and password
    console.log("calling webservice with")
    console.log("login " + user_name + " " + password);
    console.log("/" + "login/")
    var sendInfo = JSON.stringify(
      {
        "user_name": user_name,
        "password": password
      }
    );

    $.ajax(
    {
      contentType: "application/json",
      type: "POST",
      url: URI("/" + "login"),
      success: function(result)
      {
        console.log("success " + result);
      },
      error: function(request, status, reason_phrase)
      {
        console.log("error request:" + request.responseJSON +" status: "+ status + " reason: " + reason_phrase);
      },
      data: sendInfo
    });

    console.log("done")
  }

  function logout()
  {
    console.log("logging out");
    $.ajax(
    {
      type: "DELETE",
      url: "/" + "logout",
      success: function()
      {
        console.log("success")
      },
      error: function(request, status, reason_phrase)
      {
        console.log("fail")
      },
    });
  }
  function b64EncodeUnicode(str) {
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function(match, p1) {
        return String.fromCharCode('0x' + p1);
    }));
}
  document.getElementById("go").addEventListener("click", login, false);
  document.getElementById("logout").addEventListener("click", logout, false);
});