# Copyright 2018 NOKIA
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

import os

from horizon import loaders

from nuage_horizon.dashboards.project.security_groups import urls  # noqa

security_groups_dir = os.path.dirname(__file__)
template_dir = os.path.join(security_groups_dir, "templates")
loaders.panel_template_dirs['nuage/security_groups'] = template_dir
