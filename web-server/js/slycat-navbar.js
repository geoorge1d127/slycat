/*
Copyright 2013, Sandia Corporation. Under the terms of Contract
DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
rights in this software.
*/

define("slycat-navbar", ["slycat-server-root", "slycat-web-client", "slycat-projects-feed", "slycat-models-feed", "knockout", "knockout-mapping"], function(server_root, client, projects_feed, models_feed, ko, mapping)
{
  ko.components.register("slycat-navbar",
  {
    viewModel: function(params)
    {
      var component = this;
      component.server_root = server_root;

      // Display alerts for special circumstances.
      component.alerts = mapping.fromJS([]);

      // Keep track of project data, if any.
      component.project_id = ko.observable(params.project_id);

      component.project = projects_feed.watch().filter(function(project)
      {
        return project._id() == component.project_id();
      }).map(function(project)
      {
        return {
          _id: project._id,
          name: project.name,
          description: project.description,
          creator: project.creator,
          created: project.created,
          acl: project.acl,
          popover: ko.pureComputed(function()
          {
            var members = [];
            for(var i = 0; i != project.acl.administrators().length; ++i)
              members.push(project.acl.administrators()[i].user());
            for(var i = 0; i != project.acl.writers().length; ++i)
              members.push(project.acl.writers()[i].user());
            for(var i = 0; i != project.acl.readers().length; ++i)
              members.push(project.acl.readers()[i].user());
            var result = "<p>" + project.description() + "</p>";
            result += "<p><small>Members: " + members.join(",") + "</small></p>";
            result += "<p><small><em>Created " + project.created() + " by " + project.creator() + "</em></small></p>";
            return result;
          }),
        };
      });

      // Setup / categorize wizards.
      component.wizards = mapping.fromJS([]);

      var create_wizards = component.wizards.filter(function(wizard)
      {
        return wizard.require.action() === "create";
      });
      var edit_wizards = component.wizards.filter(function(wizard)
      {
        return wizard.require.action() === "edit";
      });
      var delete_wizards = component.wizards.filter(function(wizard)
      {
        return wizard.require.action() === "delete";
      });
      var global_wizard_filter = function(wizard)
      {
        return wizard.require.context() === "global";
      }
      var project_wizard_filter = function(wizard)
      {
        return wizard.require.context() === "project" && component.project_id();
      }
      var model_wizard_filter = function(wizard)
      {
        if("model-type" in wizard.require && wizard.require["model-type"].indexOf(component.model["model-type"]()) == -1)
          return false;
        return wizard.require.context() === "model" && component.model._id();
      }
      component.global_create_wizards = create_wizards.filter(global_wizard_filter);
      component.project_create_wizards = create_wizards.filter(project_wizard_filter);
      component.model_create_wizards = create_wizards.filter(model_wizard_filter);
      component.global_edit_wizards = edit_wizards.filter(global_wizard_filter);
      component.project_edit_wizards = edit_wizards.filter(project_wizard_filter);
      component.model_edit_wizards = edit_wizards.filter(model_wizard_filter);
      component.global_delete_wizards = delete_wizards.filter(global_wizard_filter);
      component.project_delete_wizards = delete_wizards.filter(project_wizard_filter);
      component.model_delete_wizards = delete_wizards.filter(model_wizard_filter);
      component.wizard = ko.observable(false);

      component.model = mapping.fromJS({_id:params.model_id, "model-type":params.model_type, name:params.model_name, created:"", creator:"",description:"", marking:params.model_marking});
      component.model_popover = ko.pureComputed(function()
      {
        return "<p>" + component.model.description() + "</p><p><small><em>Created " + component.model.created() + " by " + component.model.creator() + "</em></small></p>";
      });
      component.user = {uid : ko.observable(""), name : ko.observable("")};
      component.version = mapping.fromJS({version:"unknown", commit:"unknown"});

      // Watch running models
      component.models = models_feed.watch();
      component.open_models = component.models.filter(function(model)
      {
        return model.state() && model.state() != "closed";
      });
      component.finished_models = component.open_models.filter(function(model)
      {
        return model.state() == "finished";
      });
      component.running_models = component.open_models.filter(function(model)
      {
        return model.state() != "finished";
      }).map(function(model)
      {
        return  {
          _id: model._id,
          name: model.name,
          progress_percent: ko.pureComputed(function()
          {
            return model.progress() * 100;
          }),
          progress_type: ko.pureComputed(function()
          {
            return model.state() === "running" ? "success" : null;
          }),
        }
      });

      component.close_model = function(model)
      {
        $.ajax(
        {
          contentType : "application/json",
          data : $.toJSON({ "state" : "closed" }),
          processData : false,
          type : "PUT",
          url : server_root + "models/" + model._id(),
        });
      }

      component.run_wizard = function(item)
      {
        component.wizard(false);
        component.wizard(item.type());
        $("#slycat-wizard").modal("show");
      }

      component.about = function()
      {
        client.get_configuration_version(
        {
          success : function(version)
          {
            mapping.fromJS(version, component.version);
          }
        });

        $("#slycat-about").modal("show");
      }

      component.support_request = function()
      {
        $.ajax(
        {
          type : "GET",
          url : server_root + "configuration/support-email",
          success : function(email)
          {
            window.location.href = "mailto:" + email.address + "?subject=" + email.subject;
          }
        });
      }

      component.open_documentation = function()
      {
        window.open("http://slycat.readthedocs.org");
      }

      // If there's a current model, load it.
      if(params.model_id)
      {
        $.ajax(
        {
          type : "GET",
          url : server_root + "models/" + params.model_id,
          success : function(model)
          {
            mapping.fromJS(model, component.model);
            component.new_model_description(model.description);

            if(model.state == "waiting")
              component.alerts.push({"type":"info", "message":"The model is waiting for data to be uploaded.", "detail":null})

            if(model.state == "running")
              component.alerts.push({"type":"success", "message":"The model is being computed.  Patience!", "detail":null})

            if(model.result == "failed")
              component.alerts.push({"type":"danger", "message":"Model failed to build.  Here's what was happening when things went wrong:", "detail": model.message})

            if(model.state == "finished")
              component.close_model(component.model);
          },
        });
      }

      // Get the set of available wizards.
      $.ajax(
      {
        type : "GET",
        url : server_root + "configuration/wizards",
        success : function(wizards)
        {
          wizards.sort(function(left, right)
          {
            return left.label < right.label ? -1 : left.label > right.label ? 1 : 0;
          });

          mapping.fromJS(wizards, component.wizards);
          for(var i = 0; i != wizards.length; ++i)
          {
            ko.components.register(wizards[i].type,
            {
              require: component.server_root + "resources/wizards/" + wizards[i].type + "/ui.js"
            });
          }
        }
      });

      // Get information about the currently-logged-in user.
      client.get_user(
      {
        success: function(user)
        {
          component.user.uid(user.uid);
          component.user.name(user.name);
        }
      });

    },
    template: ' \
<div class="bootstrap-styles"> \
  <nav class="navbar navbar-default"> \
    <div class="container"> \
      <div class="navbar-header"> \
        <button type="button" class="navbar-toggle collapsed" data-toggle="collapse" data-target="#slycat-navbar-content"> \
          <span class="sr-only">Toggle navigation</span> \
          <span class="icon-bar"></span> \
          <span class="icon-bar"></span> \
          <span class="icon-bar"></span> \
        </button> \
        <a class="navbar-brand" data-bind="attr:{href:server_root + \'projects\'}">Slycat</a> \
      </div> \
      <div class="collapse navbar-collapse" id="slycat-navbar-content"> \
        <ol class="breadcrumb navbar-left"> \
          <li data-bind="visible: true"><a data-bind="attr:{href:server_root + \'projects\'}">Projects</a></li> \
          <!-- ko foreach: project --> \
          <li><a data-bind="text:name,popover:{trigger:\'hover\',html:true,content:popover()},attr:{href:$parent.server_root + \'projects/\' + _id()}"></a></li> \
          <!-- /ko --> \
          <li data-bind="visible: model._id"><a id="slycat-model-description" data-bind="text:model.name,popover:{trigger:\'hover\',html:true,content:model_popover()}"></a></li> \
        </ol> \
        <ul class="nav navbar-nav navbar-left"> \
          <li class="dropdown" data-bind="visible: global_create_wizards().length || project_create_wizards().length || model_create_wizards().length"> \
            <button type="button" class="btn btn-xs btn-success navbar-btn dropdown-toggle" data-toggle="dropdown">Create <span class="caret"></span></button> \
            <ul class="dropdown-menu"> \
              <!-- ko foreach: model_create_wizards --> \
                <li><a data-bind="text: label, click:$parent.run_wizard"></a></li> \
              <!-- /ko --> \
              <li class="divider" data-bind="visible: model_create_wizards().length && project_create_wizards().length"></li> \
              <!-- ko foreach: project_create_wizards --> \
                <li><a data-bind="text: label, click:$parent.run_wizard"></a></li> \
              <!-- /ko --> \
              <li class="divider" data-bind="visible: project_create_wizards().length && global_create_wizards().length"></li> \
              <!-- ko foreach: global_create_wizards --> \
                <li><a data-bind="text: label, click:$parent.run_wizard"></a></li> \
              <!-- /ko --> \
            </ul> \
          </li> \
          <li class="dropdown" data-bind="visible: global_edit_wizards().length || project_edit_wizards().length || model_edit_wizards().length"> \
            <button type="button" class="btn btn-xs btn-warning navbar-btn dropdown-toggle" data-toggle="dropdown">Edit <span class="caret"></span></button> \
            <ul class="dropdown-menu"> \
              <!-- ko foreach: model_edit_wizards --> \
                <li><a data-bind="text: label, click:$parent.run_wizard"></a></li> \
              <!-- /ko --> \
              <li class="divider" data-bind="visible: model_edit_wizards().length && project_edit_wizards().length"></li> \
              <!-- ko foreach: project_edit_wizards --> \
                <li><a data-bind="text: label, click:$parent.run_wizard"></a></li> \
              <!-- /ko --> \
              <li class="divider" data-bind="visible: project_edit_wizards().length && global_edit_wizards().length"></li> \
              <!-- ko foreach: global_edit_wizards --> \
                <li><a data-bind="text: label, click:$parent.run_wizard"></a></li> \
              <!-- /ko --> \
            </ul> \
          </li> \
          <li class="dropdown" data-bind="visible: global_delete_wizards().length || project_delete_wizards().length || model_delete_wizards().length"> \
            <button type="button" class="btn btn-xs btn-danger navbar-btn dropdown-toggle" data-toggle="dropdown">Delete <span class="caret"></span></button> \
            <ul class="dropdown-menu"> \
              <!-- ko foreach: model_delete_wizards --> \
                <li><a data-bind="text: label, click:$parent.run_wizard"></a></li> \
              <!-- /ko --> \
              <li class="divider" data-bind="visible: model_delete_wizards().length && project_delete_wizards().length"></li> \
              <!-- ko foreach: project_delete_wizards --> \
                <li><a data-bind="text: label, click:$parent.run_wizard"></a></li> \
              <!-- /ko --> \
              <li class="divider" data-bind="visible: project_delete_wizards().length && global_delete_wizards().length"></li> \
              <!-- ko foreach: global_delete_wizards --> \
                <li><a data-bind="text: label, click:$parent.run_wizard"></a></li> \
              <!-- /ko --> \
            </ul> \
          </li> \
          <li class="dropdown" data-bind="visible:open_models().length"> \
            <a class="dropdown-toggle" data-toggle="dropdown"><span class="badge"><span data-bind="text:running_models().length"></span> / <span data-bind="text:finished_models().length"></span></span><span class="caret"></span></a> \
            <ul class="dropdown-menu"> \
              <!-- ko foreach: finished_models --> \
                <li> \
                  <a data-bind="attr:{href:$parent.server_root + \'models/\' + $data._id()},popover:{trigger:\'hover\',content:$data.message()}"> \
                    <button type="button" class="btn btn-default btn-xs" data-bind="click:$parent.close_model,clickBubble:false,css:{\'btn-success\':$data.result()===\'succeeded\',\'btn-danger\':$data.result()!==\'succeeded\'}"><span class="glyphicon glyphicon-ok"></span></button> \
                    <span data-bind="text:name"></span> \
                  </a> \
                </li> \
              <!-- /ko --> \
              <li class="divider" data-bind="visible:finished_models().length && running_models().length"></li> \
              <!-- ko foreach: running_models --> \
                <li> \
                  <a data-bind="attr:{href:$parent.server_root + \'models/\' + $data._id()}"> \
                    <span data-bind="text:name"></span> \
                  </a> \
                  <div style="height:10px; margin: 0 10px" data-bind="progress:{value:progress_percent,type:progress_type}"> \
                </li> \
              <!-- /ko --> \
            </ul> \
          </li> \
        </ul> \
        <ul class="nav navbar-nav navbar-right"> \
          <li class="navbar-text"><span data-bind="text:user.name,popover:{trigger:\'hover\',content:\'Username: \' + user.uid()}"></span></li> \
          <li class="dropdown"> \
            <a class="dropdown-toggle" data-toggle="dropdown">Help <span class="caret"></span></a> \
            <ul class="dropdown-menu"> \
              <li><a data-bind="click:about">About Slycat</a></li> \
              <li><a data-bind="click:support_request">Support Request</a></li> \
              <li><a data-bind="click:open_documentation">Documentation</a></li> \
            </ul> \
          </li> \
        </ul> \
      </div> \
    </div> \
  </nav> \
  <!-- ko foreach: alerts --> \
    <div class="alert slycat-navbar-alert" data-bind="css:{\'alert-danger\':$data.type === \'danger\',\'alert-info\':$data.type === \'info\',\'alert-success\':$data.type === \'success\'}"> \
      <p data-bind="text:message"></p> \
      <pre data-bind="visible:detail,text:detail,css:{\'bg-danger\':$data.type === \'danger\',\'bg-info\':$data.type === \'info\',\'bg-success\':$data.type === \'success\'}"></pre> \
    </div> \
  <!-- /ko --> \
  <div class="modal fade" id="slycat-wizard" data-backdrop="static"> \
    <div class="modal-dialog"> \
      <div class="modal-content"> \
        <div data-bind="if: wizard"> \
          <div data-bind="component:{name:wizard,params:{project:project()[0],model:model}}"> \
          </div> \
        </div> \
      </div> \
    </div> \
  </div> \
  <div class="modal fade" id="slycat-about"> \
    <div class="modal-dialog"> \
      <div class="modal-content"> \
        <div class="modal-body"> \
          <div class="jumbotron"> \
            <img data-bind="attr:{src:server_root + \'css/slycat-brand.png\'}"/> \
            <p>&hellip; is the web-based analysis and visualization platform created at Sandia National Laboratories.</p> \
          </div> \
          <p>Version <span data-bind="text:version.version"></span>, commit <span data-bind="text:version.commit"></span></p> \
          <p><small>Copyright 2013, Sandia Corporation. Under the terms of Contract DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain rights in this software.</small></p> \
        </div> \
        <div class="modal-footer"> \
          <button type="button" class="btn btn-default" data-dismiss="modal">Close</button> \
        </div> \
      </div> \
    </div> \
  </div> \
</div> \
'

  });
});

