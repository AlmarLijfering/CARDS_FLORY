(function () {
  const searchInput = document.getElementById('card-search');
  const labelFilter = document.getElementById('label-filter');
  const assignmentFilter = document.getElementById('assignment-filter');
  const status = document.getElementById('card-filter-status');
  const rows = Array.from(document.querySelectorAll('[data-card-row]'));

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
    const checkedCount = row.querySelectorAll('input[type="checkbox"]:checked').length;
    const labelIds = Array.from(row.querySelectorAll('input[type="checkbox"]:checked')).map((input) => input.value);
    row.dataset.assigned = checkedCount > 0 ? 'true' : 'false';
    row.dataset.labelIds = labelIds.length ? `,${labelIds.join(',')},` : ',,';
    row.dataset.search = [
      row.dataset.cardId || '',
      ...Array.from(row.querySelectorAll('.form-check-label')).map((node, index) => {
        return row.querySelectorAll('input[type="checkbox"]')[index].checked ? node.textContent.toLowerCase() : '';
      })
    ].join(' ');
  }

  function updateVisibility() {
    const term = (searchInput?.value || '').trim().toLowerCase();
    const selectedLabel = labelFilter?.value || 'all';
    const assignmentState = assignmentFilter?.value || 'all';
    let visible = 0;

    rows.forEach((row) => {
      const show = matchesSearch(row, term) && matchesLabel(row, selectedLabel) && matchesAssignment(row, assignmentState);
      row.classList.toggle('card-row-hidden', !show);
      if (show) {
        visible += 1;
      }
    });

    if (status) {
      status.textContent = `${visible} cards visible`;
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

  updateVisibility();
}());
