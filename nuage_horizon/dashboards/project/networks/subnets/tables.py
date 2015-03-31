from django.utils.translation import ugettext_lazy as _

from openstack_dashboard.dashboards.project.networks.subnets import \
    tables as def_tables
from horizon import tables


class NuageSubnetsTable(def_tables.SubnetsTable):
    vsd_managed = tables.Column("vsd_managed",
                                  verbose_name=_("VSD Managed"))

    def __init__(self, request, data=None, needs_form_wrapper=None, **kwargs):
        super(NuageSubnetsTable, self).__init__(request, data,
                                                needs_form_wrapper, **kwargs)
        if not request.user.is_superuser:
            del self.columns['vsd_managed']

    class Meta(def_tables.SubnetsTable.Meta):
        pass