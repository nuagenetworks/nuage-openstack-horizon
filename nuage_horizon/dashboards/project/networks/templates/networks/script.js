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
        $this = $(this);
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
    }
  })
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

var subnet_select = new NuageLinkedSelect({
  $source: $('#id_sub_id'),
  url: '/project/networks/listSubnets',
  qparams: function(param){
    return {'zone_id': param};
  }
});
var zone_select = new NuageLinkedSelect({
  $source: $('#id_zone_id'),
  url: '/project/networks/listZones',
  qparams: function(param){
    return {'dom_id': param};
  },
  next: subnet_select
});
var domain_select = new NuageLinkedSelect({
  $source: $('#id_dom_id'),
  pre_trigger: function() {
    var type = this.get_opt().obj['type'];
    if (type == 'L2') {
      var l2dom_id = this.$source.val();
      subnet_select.clear_opts();
      var opts = subnet_select.get_opts();
      opts[opts.length] = new Option(l2dom_id, l2dom_id);
      subnet_select.$source.val(l2dom_id);
      return false;
    }
    return type == 'L3'
  },
  url: '/project/networks/listDomains',
  qparams: function(param){
    return {'org_id': param};
  },
  data_to_opts: function(opts, page_data) {
    L2_L3_optgroups("L2", page_data, this) ;
    L2_L3_optgroups("L3", page_data, this) ;
  },
  next: zone_select
});
var organisation_select = new NuageLinkedSelect({
  $source: $('#id_org_id'),
  url: '/project/networks/listOrganizations',
  next: domain_select
});
var subnet_type_select = new NuageLinkedSelect({
  $source: $('#id_subnet_type'),
  pre_trigger: function() {
    return this.$source.val() == 'vsd_auto';
  },
  next: organisation_select
});

subnet_type_select.hide_next();