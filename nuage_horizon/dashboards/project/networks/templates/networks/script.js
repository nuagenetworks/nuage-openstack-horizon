var WEB_ROOT = WEBROOT.endsWith('/') ? WEBROOT.slice(0,-1) : WEBROOT;

function hideTab(checked, hide_on, hide_tab) {
  if (checked == hide_on) {
    // If the checkbox is not checked then hide the tab
    $('*[data-target="#' + hide_tab + '"]').parent().hide();
    $('.button-next').hide();
    $('.button-final').show();
  } else if (!$('*[data-target="#' + hide_tab + '"]').parent().is(':visible')) {
    // If the checkbox is checked and the tab is currently hidden then show the tab again
    $('*[data-target="#' + hide_tab + '"]').parent().show();
    $('.button-final').hide();
    $('.button-next').show();
  }
}

$(document).on("change", 'input.switchable', function (evt) {
  var $fieldset = $(evt.target).closest('fieldset'),
      $switchables = $fieldset.find('input.switchable');

  $switchables.each(function (index, switchable) {
    var $switchable = $(switchable),
      hide_tabs = $switchable.data('hide-tabs'),
      checked = $switchable.prop('checked'),
      hide_on = $switchable.data('hideOnChecked');

    if (hide_tabs) {
      hide_tabs = hide_tabs.split(' ');
      for (var i = 0; i < hide_tabs.length; i++) {
        hideTab(checked, hide_on, hide_tabs[i]);
      }
    }
  });
});
var wizard = $('.workflow.wizard');

horizon.modals.init_wizard = function () {
  // If workflow is in wizard mode, initialize wizard.
  var _max_visited_step = 0;
  var _validate_steps = function (start, end) {
    var $form = $('.workflow > form'),
        response = {};

    if (typeof end === 'undefined') {
      end = start;
    }

    // Clear old errors.
    $form.find('div.row div.alert-danger').remove();
    $form.find('.form-group.error').each(function () {
      var $group = $(this);
      $group.removeClass('error');
      $group.find('span.help-block.alert-danger').remove();
    });

    // Send the data for validation.
    $.ajax({
      type: 'POST',
      url: $form.attr('action'),
      headers: {
        'X-Horizon-Validate-Step-Start': start,
        'X-Horizon-Validate-Step-End': end
      },
      data: $form.serialize(),
      dataType: 'json',
      async: false,
      success: function (data) { response = data; }
    });

    // Handle errors.
    if (response.has_errors) {
      var first_field = true;

      $.each(response.errors, function (step_slug, step_errors) {
        var step_id = response.workflow_slug + '__' + step_slug,
            $fieldset = $form.find('#' + step_id);
        $.each(step_errors, function (field, errors) {
          var $field;
          if (field === '__all__') {
            // Add global errors.
            $.each(errors, function (index, error) {
              $fieldset.find('div.row').prepend(
                      '<div class="alert alert-danger">' +
                      error + '</div>');
            });
            $fieldset.find('input,  select, textarea').first().focus();
            return;
          }
          // Add field errors.
          $field = $fieldset.find('[name="' + field + '"]');
          $field.closest('.form-group').addClass('error');
          $.each(errors, function (index, error) {
            $field.before(
                    '<span class="help-block alert-danger">' +
                    error + '</span>');
          });
          // Focus the first invalid field.
          if (first_field) {
            $field.focus();
            first_field = false;
          }
        });
      });

      return false;
    }

    var formData = response.form_data;
    if (formData) {
      $.each(formData, function (id, value) {
        $('#' + id).val(value);
      });
    }
    select_box = $('#id_ip_version');
    if (select_box && 'id_ip_version' in formData) {
        old_parent = select_box.parent()
        select_box.insertBefore(select_box.parent());
        old_parent.remove();
    }

    var lockedFields = response.locked_fields;
    if (lockedFields) {
      $.each(lockedFields, function (id, locked) {
        var element = $('#' + id);
        if (locked) {
          element.attr('readonly', 'readonly');
          if (element.is('select')) {
            element.attr('onfocus', 'this.defaultIndex=this.selectedIndex;');
            element.attr('onchange', 'this.selectedIndex=this.defaultIndex;');
          }
        } else {
          element.removeAttr('readonly');
          if (element.is('select')) {
            element.removeAttr('onfocus', 'this.defaultIndex=this.selectedIndex;');
            element.removeAttr('onchange', 'this.selectedIndex=this.defaultIndex;');
          }
        }
      });
    }

    var hiddenFields = response.hidden_fields;
    if (hiddenFields) {
      $.each(hiddenFields, function (id, hidden) {
        if (hidden)
          $('#' + id).parent().parent().hide();
        else
          $('#' + id).parent().parent().show();
      });
    }
  };

  $('.workflow.wizard').bootstrapWizard({
    tabClass: 'wizard-tabs',
    nextSelector: '.button-next',
    previousSelector: '.button-previous',
    onTabShow: function (tab, navigation, index) {
      var $navs = navigation.find('li');
      var total = $navs.length;
      var current = index;
      var $footer = $('.modal-footer');
      _max_visited_step = Math.max(_max_visited_step, current);
      if (current + 1 >= total) {
        $footer.find('.button-next').hide();
        $footer.find('.button-final').show();
      } else {
        $footer.find('.button-next').show();
        $footer.find('.button-final').hide();
      }
      $navs.each(function(i) {
        var $this = $(this);
        if (i <= _max_visited_step) {
          $this.addClass('done');
        } else {
          $this.removeClass('done');
        }
      });
    },
    onNext: function ($tab, $nav, index) {
      return _validate_steps(index - 1);
    },
    onTabClick: function ($tab, $nav, current, index) {
      // Validate if moving forward, but move backwards without validation
      return (index <= current ||
          _validate_steps(current, index - 1) !== false);
    },
    onShow: function(activetab, navigation, index) {
      _validate_steps(index-2)
    }
  });
};

function L2_L3_optgroups(group, page_data, select) {
  var groupElement;
  for (var i=0 ; i<page_data.length ; i++) {
    var obj = page_data[i];
    if (obj.type == group) {
      if (!groupElement) {
        groupElement = document.createElement("OPTGROUP");
        groupElement.label=group;
        select.$source.append(groupElement);
      }
      var opt = new Option(select.opt_name(obj), select.opt_val(obj));
      opt.obj = obj;
      groupElement.appendChild(opt);
    }
  }
}

function callback($hidden) {
  return function() {
    var id = $hidden.val();
    if (!id)
      return;

    var found = false;
    $source = this.$source;
    $source.find('option').each(function () {
      if (this.value == id) {
        $source.val(id);
        $source.trigger('change');
        found = true;
      }
    });
    if (!found) {
      $hidden.val('');
    }
  }
}

ip_version_load_data = function(param){
  this.clear_opts();
  var type = domain_select.get_opt().obj['type'];
  var selected_subnet = (type == 'L2' ? domain_select.get_opt().obj : subnet_select.get_opt().obj);

  var opts = this.get_opts();

  var opt = new Option(selected_subnet['cidr'], 4);
  opt.obj = selected_subnet;
  opts[opts.length] = opt;

  opt = new Option(selected_subnet['ipv6_cidr'], 6);
  opt.obj = selected_subnet;
  opts[opts.length] = opt;
}

var ip_version_select = new NuageLinkedSelect({
  $source: $('#id_ip_version_'),
  pre_trigger: function(){
    var ip_version = this.get_opt().value;
    $('#id_hidden_ip_version_').val(ip_version);
    fill_gateway(ip_version);
    var selected_subnet;
    if (domain_select.get_opt().obj['type'] == 'L3')
    {
      selected_subnet = subnet_select.get_opt().obj
    }
    else
    {
      selected_subnet = domain_select.get_opt().obj;
    }
    if (ip_version == 4)
    {
      enable_dhcp = selected_subnet['enable_dhcpv4'];
    }
    else
    {
      enable_dhcp = selected_subnet['enable_dhcpv6'];
    }
    $('#id_enable_dhcp').prop('checked', enable_dhcp);
    return false;
  },
  callback: callback($('#id_hidden_ip')),
  load_data: ip_version_load_data
});

var subnet_select = new NuageLinkedSelect({
  $source: $('#id_sub_id'),
  ajax_url: WEB_ROOT + '/project/networks/listSubnets',
  qparams: function(param){
    return {'zone_id': param};
  },
  next: ip_version_select,
  pre_trigger: function(){
    var sub_id = this.get_opt().obj['id'];
    $('#id_hidden_sub').val(sub_id);
    var ip_version = this.get_opt().obj['ip_version'];

    if(ip_version == 'DUALSTACK')
    {
       return NUAGELINKEDSELECT_CONTINUE;
    }
    else if (ip_version == 'IPV4')
    {
      enable_dhcp = this.get_opt().obj['enable_dhcpv4'];
      fill_gateway(4);
      $('#id_hidden_ip_version_').val(4);
    }
    else
    {
      enable_dhcp = this.get_opt().obj['enable_dhcpv6'];
      fill_gateway(6);
      $('#id_hidden_ip_version_').val(6);
    }
    $('#id_enable_dhcp').prop('checked', enable_dhcp);
    return NUAGELINKEDSELECT_ABORT;
  },
  callback: callback($('#id_hidden_sub'))
});
var zone_select = new NuageLinkedSelect({
  $source: $('#id_zone_id'),
  ajax_url: WEB_ROOT + '/project/networks/listZones',
  qparams: function(param){
    return {'dom_id': param};
  },
  next: subnet_select,
  pre_trigger: function(){
    var zone_id = this.get_opt().obj['id'];
    $('#id_hidden_zone').val(zone_id);
    return NUAGELINKEDSELECT_CONTINUE;
  },
  callback: callback($('#id_hidden_zone'))
});
var domain_select = new NuageLinkedSelect({
  $source: $('#id_dom_id'),
  pre_trigger: function () {
    var type = this.get_opt().obj['type'];
    var dom_id = this.get_opt().obj['id'];
    $('#id_hidden_dom').val(dom_id);
    disable_checkbox('id_no_gateway');
    if(type == 'L3')
        return NUAGELINKEDSELECT_CONTINUE;
    else if (type == 'L2') {
      if(!this.get_opt().obj['dhcp_managed'])
      {
        enable_checkbox('id_no_gateway');
      }

      var l2dom_id = this.$source.val();
      subnet_select.clear_opts();
      var opts = subnet_select.get_opts();
      opts[opts.length] = new Option(l2dom_id, l2dom_id);
      subnet_select.$source.val(l2dom_id);
      $('#id_hidden_sub').val(l2dom_id);

      if(this.get_opt().obj['dhcp_managed'] && this.get_opt().obj['ip_version'] == 'DUALSTACK')
        return NUAGELINKEDSELECT_SKIP2; // skip zone and subnet selection as those are for L3
      else
        {
          // Determine enable_dhcp
          var ip_version = this.get_opt().obj['ip_version'];
          var enable_dhcp;
          if (! this.get_opt().obj['dhcp_managed'])
          {
            enable_dhcp = false
            // Set gateway to None
            fill_gateway(null)
          }
          else if (ip_version == 'IPV4')
          {
            enable_dhcp = this.get_opt().obj['enable_dhcpv4'];
            fill_gateway(4);
            $('#id_hidden_ip_version_').val(4);
          }
          else
          {
            enable_dhcp = this.get_opt().obj['enable_dhcpv6'];
            fill_gateway(6)
            $('#id_hidden_ip_version_').val(6);
          }
          $('#id_enable_dhcp').prop('checked', enable_dhcp);
          return NUAGELINKEDSELECT_ABORT; // no cidr selection needed
        }
    }
    else {
      console.error('Unable to determine whether L2 or L3 domain');
    }
  },
  ajax_url: WEB_ROOT + '/project/networks/listDomains',
  qparams: function (param) {
    return {'org_id': param};
  },
  data_to_opts: function (opts, page_data) {
    L2_L3_optgroups("L2", page_data, this);
    L2_L3_optgroups("L3", page_data, this);
  },
  next: zone_select,
  callback: callback($('#id_hidden_dom'))
});
var organisation_select = new NuageLinkedSelect({
  $source: $('#id_org_id'),
  ajax_url: WEB_ROOT + '/project/networks/listOrganizations',
  next: domain_select,
  pre_trigger: function(){
    var org_id = this.get_opt().obj['id'];
    $('#id_hidden_org').val(org_id);
    return NUAGELINKEDSELECT_CONTINUE;
  },
  callback: callback($('#id_hidden_org'))
});
var subnet_type_select = new NuageLinkedSelect({
  $source: $('#id_subnet_type'),
  pre_trigger: function() {

   // reset
   $(organisation_select.$source).prop('selectedIndex',0).trigger('change');
   enable_checkbox('id_enable_dhcp');
   enable_checkbox('id_no_gateway');

    if(this.$source.val() == 'vsd_auto')
    {
      disable_checkbox('id_enable_dhcp');
      return NUAGELINKEDSELECT_CONTINUE;
    }
    else
    {
      enable_checkbox('id_enable_dhcp');
      return NUAGELINKEDSELECT_ABORT;
    }
  },
  next: organisation_select
});

if (subnet_type_select.$source.prop("selectedIndex") != 0) {
  subnet_type_select.$source.trigger('change');
} else {
  subnet_type_select.hide_next();
}

function fill_gateway(ip_version) {
  // determine the correct gateway from what the user selected in the form
  var obj = domain_select.get_opt().obj['type'] == 'L2' ? domain_select.get_opt().obj : subnet_select.get_opt().obj;
  gateway = obj[ip_version == 4 ? 'gateway' : 'ipv6_gateway'];

  // fill the hidden gateway field
  $('#id_hidden_gateway_').val(gateway ? gateway : "");

  // fill the no_gateway checkbox
  $('#id_no_gateway').prop('checked', gateway ? false : true); // TODO adapt formData system to fill checkbox (cleaner)
}

function enable_checkbox(id)
{
  /* went with this implementations because
      - attribute 'disabled' causes value to be ignored when submitting the form
      - attribute 'readonly' does not work on checkboxes
  */
  $("#"+id).attr('onclick','');
}

function disable_checkbox(id)
{
  $("#"+id).attr('onclick','return false;');
}