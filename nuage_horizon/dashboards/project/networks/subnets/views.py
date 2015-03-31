import json

from django import forms
from django import http
from django import shortcuts

from openstack_dashboard.dashboards.project.networks.subnets import views
from nuage_horizon.dashboards.project.networks.subnets \
    import workflows as nuage_workflows
from horizon import exceptions
from horizon import messages


class CreateView(views.CreateView):
    workflow_class = nuage_workflows.CreateSubnet
    ajax_template_name = 'nuage/networks/create.html'

    def add_locked_fields(self, workflow, form_data):
        """Asks each action if form-fields should become read-only.

        Returns a list of tuples (id, locked:boolean) who should be read-only or
        not.
        """
        fields = {}
        for step in workflow.steps:
            if hasattr(step.action, 'get_locked_fields'):
                fields.update(step.action.get_locked_fields(workflow.context,
                                                            form_data))
        return fields

    def add_hidden_fields(self, workflow):
        """Asks each action if form-fields should be hidden or shown.

        Returns a list of tuples (id, hidden:boolean) who should be hidden or
        shown.
        """
        fields = {}
        for step in workflow.steps:
            if hasattr(step.action, 'get_hidden_fields'):
                fields.update(step.action.get_hidden_fields(workflow.context))
        return fields

    def add_form_data(self, workflow, step_index, request):
        """Ask the next step if any fields should be initialized with data.
        """
        form_data = {}
        step = workflow.steps[step_index+1]
        if hasattr(step.action, 'get_form_data'):
            form_data.update(step.action.get_form_data(workflow.context,
                                                       request))
        return form_data

    def post(self, request, *args, **kwargs):
        """Handler for HTTP POST requests."""
        context = self.get_context_data(**kwargs)
        workflow = context[self.context_object_name]
        try:
            # Check for the VALIDATE_STEP* headers, if they are present
            # and valid integers, return validation results as JSON,
            # otherwise proceed normally.
            validate_step_start = int(self.request.META.get(
                'HTTP_X_HORIZON_VALIDATE_STEP_START', ''))
            validate_step_end = int(self.request.META.get(
                'HTTP_X_HORIZON_VALIDATE_STEP_END', ''))
        except ValueError:
            # No VALIDATE_STEP* headers, or invalid values. Just proceed
            # with normal workflow handling for POSTs.
            pass
        else:
            # There are valid VALIDATE_STEP* headers, so only do validation
            # for the specified steps and return results.
            data = self.validate_steps(request, workflow,
                                       validate_step_start,
                                       validate_step_end)
            data['form_data'] = self.add_form_data(workflow, validate_step_end,
                                                   request)
            data['locked_fields'] = self.add_locked_fields(workflow,
                                                           data['form_data'])
            data['hidden_fields'] = self.add_hidden_fields(workflow)
            return http.HttpResponse(json.dumps(data),
                                     content_type="application/json")
        if not workflow.is_valid():
            return self.render_to_response(context)
        try:
            success = workflow.finalize()
        except forms.ValidationError:
            return self.render_to_response(context)
        except Exception:
            success = False
            exceptions.handle(request)
        if success:
            msg = workflow.format_status_message(workflow.success_message)
            messages.success(request, msg)
        else:
            msg = workflow.format_status_message(workflow.failure_message)
            messages.error(request, msg)
        if "HTTP_X_HORIZON_ADD_TO_FIELD" in self.request.META:
            field_id = self.request.META["HTTP_X_HORIZON_ADD_TO_FIELD"]
            data = [self.get_object_id(workflow.object),
                    self.get_object_display(workflow.object)]
            response = http.HttpResponse(json.dumps(data))
            response["X-Horizon-Add-To-Field"] = field_id
            return response
        next_url = self.request.REQUEST.get(workflow.redirect_param_name, None)
        return shortcuts.redirect(next_url or workflow.get_success_url())


class UpdateView(views.UpdateView):
    workflow_class = nuage_workflows.UpdateSubnet
    ajax_template_name = 'nuage/networks/create.html'