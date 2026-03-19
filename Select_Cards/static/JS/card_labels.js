(function () {
  const searchInput = document.getElementById('card-search');
  const labelFilter = document.getElementById('label-filter');
  const assignmentFilter = document.getElementById('assignment-filter');
  const status = document.getElementById('card-filter-status');
  const rows = Array.from(document.querySelectorAll('[data-card-row]'));
  const emptyState = document.getElementById('card-labels-empty-state');
  const clearFiltersButton = document.getElementById('clear-card-label-filters');
  const tableWrapper = document.getElementById('card-labels-table-wrapper');
  const stickyActions = document.getElementById('card-labels-sticky-actions');

  function matchesSearch(row, term) {
    return (row.dataset.search || '').includes(term);
  }

  function matchesLabel(row, labelId) {
    if (labelId === 'all') {
      return true;
    }
    return (row.dataset.labelIds || '').includes(`,${labelId},`);
  }

  function matchesAssignment(row, assignmentState) {
    if (assignmentState === 'all') {
      return true;
    }

    const isAssigned = row.dataset.assigned === 'true';
    return assignmentState === 'assigned' ? isAssigned : !isAssigned;
  }

  function updateRowAssignmentState(row) {
    const checkedInputs = Array.from(row.querySelectorAll('input[type="checkbox"]:checked'));
    const labelIds = checkedInputs.map((input) => input.value);

    row.dataset.assigned = checkedInputs.length > 0 ? 'true' : 'false';
    row.dataset.labelIds = labelIds.length ? `,${labelIds.join(',')},` : ',,';
    row.dataset.search = [
      row.dataset.cardId || '',
      ...Array.from(row.querySelectorAll('.form-check-label')).map((node, index) => {
        const input = row.querySelectorAll('input[type="checkbox"]')[index];
        return input.checked ? node.textContent.toLowerCase() : '';
      })
    ].join(' ');
  }

  function clearFilters() {
    if (searchInput) {
      searchInput.value = '';
    }
    if (labelFilter) {
      labelFilter.value = 'all';
    }
    if (assignmentFilter) {
      assignmentFilter.value = 'all';
    }
    updateVisibility();
    searchInput?.focus();
  }

  function updateVisibility() {
    const term = (searchInput?.value || '').trim().toLowerCase();
    const selectedLabel = labelFilter?.value || 'all';
    const assignmentState = assignmentFilter?.value || 'all';
    let visible = 0;

    rows.forEach((row) => {
      const show = matchesSearch(row, term)
        && matchesLabel(row, selectedLabel)
        && matchesAssignment(row, assignmentState);

      row.classList.toggle('card-row-hidden', !show);
      if (show) {
        visible += 1;
      }
    });

    if (status) {
      status.textContent = `${visible} cards visible`;
    }

    const isEmpty = visible === 0;
    if (emptyState) {
      emptyState.hidden = !isEmpty;
      emptyState.classList.toggle('d-none', !isEmpty);
    }
    if (tableWrapper) {
      tableWrapper.hidden = isEmpty;
    }
    if (stickyActions) {
      stickyActions.hidden = isEmpty;
    }
  }

  rows.forEach((row) => {
    row.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
      checkbox.addEventListener('change', () => {
        updateRowAssignmentState(row);
        updateVisibility();
      });
    });
    updateRowAssignmentState(row);
  });

  searchInput?.addEventListener('input', updateVisibility);
  labelFilter?.addEventListener('change', updateVisibility);
  assignmentFilter?.addEventListener('change', updateVisibility);
  clearFiltersButton?.addEventListener('click', clearFilters);

  updateVisibility();
}());
