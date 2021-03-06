# Copyright 2020 Nokia.
#
# Licensed under the Apache License, Version 2.0 (the "License"); you may
#    not use this file except in compliance with the License. You may obtain
#    a copy of the License at
#
#        http://www.apache.org/licenses/LICENSE-2.0
#
#    Unless required by applicable law or agreed to in writing, software
#    distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
#    WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
#    License for the specific language governing permissions and limitations
#    under the License.

from django import forms
from django import http
from django import shortcuts
from horizon import exceptions
from horizon import messages
from openstack_dashboard.dashboards.project.networks import views as original

from nuage_horizon.api import neutron
from nuage_horizon.dashboards.project.networks import tabs
from nuage_horizon.dashboards.project.networks import workflows


class NuageCreateView(original.CreateView):
    workflow_class = workflows.CreateNetwork
    ajax_template_name = 'nuage/networks/create.html'

    def add_locked_fields(self, workflow, form_data, step_index):
        """Asks each action if form-fields should become read-only.

        Returns a list of tuples (id, locked:boolean) who should be read-only
        or not.
        """
        fields = {}
        step = workflow.steps[step_index + 1]
        if hasattr(step.action, 'get_locked_fields'):
            fields.update(step.action.get_locked_fields(workflow.context,
                                                        form_data))
        return fields

    def add_hidden_fields(self, workflow, step_index):
        """Asks each action if form-fields should be hidden or shown.

        Returns a list of tuples (id, hidden:boolean) who should be hidden or
        shown.
        """
        fields = {}
        step = workflow.steps[step_index + 1]
        if hasattr(step.action, 'get_hidden_fields'):
            fields.update(step.action.get_hidden_fields(workflow.context))
        return fields

    def add_form_data(self, workflow, step_index, request):
        """Ask the next step if any fields should be initialized with data.
        """
        form_data = {}
        step = workflow.steps[step_index + 1]
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
                                                           data['form_data'],
                                                           validate_step_end)
            data['hidden_fields'] = self.add_hidden_fields(workflow,
                                                           validate_step_end)
            return http.JsonResponse(data)
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
            response = http.JsonResponse(data, safe=False)
            response["X-Horizon-Add-To-Field"] = field_id
            return response
        next_url = self.request.POST.get(workflow.redirect_param_name, None)
        return shortcuts.redirect(next_url or workflow.get_success_url())


def organization_data(request):
    org_list = neutron.vsd_organisation_list(request)
    org_list = [org.to_dict() for org in org_list]
    response = http.JsonResponse(org_list, safe=False)
    return response


def domain_data(request):
    org_id = request.GET.get('org_id', None)
    dom_list = neutron.vsd_domain_list(request, vsd_organisation_id=org_id)
    dom_list = [org.to_dict() for org in dom_list]
    response = http.JsonResponse(dom_list, safe=False)
    return response


def zone_data(request):
    dom_id = request.GET.get('dom_id', None)
    zone_list = neutron.vsd_zone_list(request, vsd_domain_id=dom_id)
    zone_list = [zone.to_dict() for zone in zone_list]
    response = http.JsonResponse(zone_list, safe=False)
    return response


def subnet_data(request):
    zone_id = request.GET.get('zone_id', None)
    subnet_list = neutron.vsd_subnet_list(request, vsd_zone_id=zone_id)
    subnet_list = [subnet.to_dict() for subnet in subnet_list]
    response = http.JsonResponse(subnet_list, safe=False)
    return response


original.DetailView.tab_group_class = tabs.NetworkDetailsTabs
