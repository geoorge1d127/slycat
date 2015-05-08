/*
Copyright 2013, Sandia Corporation. Under the terms of Contract
DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
rights in this software.
*/

define("slycat-page-demo-model", ["slycat-server-root", "slycat-bookmark-manager", "slycat-web-client", "knockout", "lodash", "URI", "domReady!"], function(server_root, bookmark_manager, client, ko, lodash, URI)
{
  var page = {};
  page.closing = false;
  page.children = ko.observableArray();
  page.add_child = function()
  {
    page.children.push(window.open(URI().addSearch({"ptype":"page-demo-child","role":"child"})));
    page.bookmark.updateState({children: page.children().length});
  }
  page.send_message = function()
  {
    lodash.each(page.children(), function(child)
    {
      child.postMessage("Sample message", "*");
    });
  }
  page.send_arraybuffer = function()
  {
    lodash.each(page.children(), function(child)
    {
      child.postMessage(new ArrayBuffer(8), "*");
    });
  }
  page.send_observable = function()
  {
    lodash.each(page.children(), function(child)
    {
      child.postMessage(ko.observableArray([1, 2, 3]), "*");
    });
  }
  page.close_children = function()
  {
    lodash.each(page.children(), function(child)
    {
      child.close();
    });
  }
  ko.applyBindings(page, document.getElementById("slycat-page-demo"));

  client.get_model(
  {
    mid: URI(window.location).segment(-1),
    success: function(model)
    {
      page.bookmark = bookmark_manager.create(model.project, model._id);
      page.bookmark.getState(function(state)
      {
        console.log("bookmark state:", state);
        if("children" in state)
        {
          for(var i = 0; i != state.children; ++i)
          {
            var child = window.open(URI().addSearch({"ptype":"page-demo-child", "role":"child"}));
            if(child)
            {
              page.children.push(child);
            }
            else
            {
              window.alert("This visualization includes multiple pages, but it looks like you have a popup-blocker.");
              break;
            }
          }
        }
        else
        {
          page.bookmark.updateState({children: 0});
        }
      });
    }
  });

  window.addEventListener("message", function(event)
  {
    console.log(event);
    if(event.data === "closing")
    {
      if(!page.closing)
      {
        page.children.remove(event.source);
        page.bookmark.updateState({children: page.children().length});
      }
    }
  });

  window.addEventListener("beforeunload", function(event)
  {
    page.closing = true;
    if(page.children().length)
    {
      var message = "This will affect all related tabs / windows.";
      event.returnValue = message;
      return message;
    }
  });

  window.addEventListener("unload", function(event)
  {
    lodash.each(page.children(), function(child)
    {
      child.close();
    });
  });
});

