define(["slycat-server-root", "slycat-web-client", "slycat-dialog", "knockout", "knockout-mapping", "text!" + $("#slycat-server-root").attr("href") + "resources/wizards/slycat-edit-project/ui.html"], function(server_root, client, dialog, ko, mapping, html)
{
  function constructor(params)
  {
    var component = {};
    component.project = params.project;
    component.modified = mapping.fromJS(mapping.toJS(params.project));
    component.permission = ko.observable("reader");
    component.permission_description = ko.pureComputed(function()
    {
      if(component.permission() == "reader")
        return "Readers can view all data in a project.";
      if(component.permission() == "writer")
        return "Writers can view all data in a project, and add, modify, or delete models.";
      if(component.permission() == "administrator")
        return "Administrators can view all data in a project, add, modify, and delete models, modify or delete the project, and add or remove project members.";
    });
    component.new_user = ko.observable("");

    component.add_project_member = function()
    {
      client.get_user(
      {
        uid: component.new_user(),
        success: function(user)
        {
          if(component.permission() == "reader")
          {
            if(window.confirm("Add " + user.name + " to the project?  They will have read access to all project data."))
            {
              component.remove_user(user.uid);
              component.modified.acl.readers.push({user:ko.observable(user.uid)})
            }
          }
          if(component.permission() == "writer")
          {
            if(window.confirm("Add " + user.name + " to the project?  They will have read and write access to all project data."))
            {
              component.remove_user(user.uid);
              component.modified.acl.writers.push({user:ko.observable(user.uid)})
            }
          }
          if(component.permission() == "administrator")
          {
            if(window.confirm("Add " + user.name + " to the project?  They will have read and write access to all project data, and will be able to add and remove other project members."))
            {
              component.remove_user(user.uid);
              component.modified.acl.administrators.push({user:ko.observable(user.uid)})
            }
          }
        },
        error: function(request, status, reason_phrase)
        {
          if(request.status == 404)
          {
            window.alert("User '" + component.new_user() + "' couldn't be found.  Ensure that you correctly entered their id, not their name.");
          }
          else
          {
            window.alert("Error retrieving user information: " + reason_phrase);
          }
        }
      });
    }

    component.remove_user = function(user)
    {
      component.modified.acl.readers.remove(function(item)
      {
        return item.user()==user;
      });
      component.modified.acl.writers.remove(function(item)
      {
        return item.user()==user;
      });
      component.modified.acl.administrators.remove(function(item)
      {
        return item.user()==user;
      });
    }

    component.remove_project_member = function(context)
    {
      component.remove_user(context.user());
    }

    component.save_project = function()
    {
      client.put_project(
      {
        pid: component.project._id(),
        name: mapping.toJS(component.modified.name),
        description: mapping.toJS(component.modified.description),
        acl: mapping.toJS(component.modified.acl),
        success: function()
        {
        },
        error: dialog.ajax_error("Error updating project."),
      });
    }
    return component;
  }

  return { viewModel: constructor, template: html };
});
