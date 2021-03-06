# Copyright 2017 NOKIA
#
#    Licensed under the Apache License, Version 2.0 (the "License"); you may
#    not use this file except in compliance with the License. You may obtain
#    a copy of the License at
#
#         http://www.apache.org/licenses/LICENSE-2.0
#
#    Unless required by applicable law or agreed to in writing, software
#    distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
#    WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
#    License for the specific language governing permissions and limitations
#    under the License.

from nuage_horizon.dashboards.project.networks.subnets import tabs as \
    subnets_tabs
from openstack_dashboard.dashboards.admin.networks.agents import tabs \
    as agents_tabs
from openstack_dashboard.dashboards.admin.networks.ports \
    import tables as ports_tables
from openstack_dashboard.dashboards.admin.networks import views


class NetworkDetailsTabs(views.NetworkDetailsTabs):
    tabs = (views.OverviewTab, subnets_tabs.SubnetsTab,
            ports_tables.PortsTab,
            agents_tabs.DHCPAgentsTab, )
