const user_display = document.getElementById('user-list');
var groups = {};

var loaded = false;

function update_user_display(data) {
  if (data.note === 'load') {
    groups = {};
    for (let drawing of data.drawings) {
      let hash = drawing.hash;
      let nickname = drawing.nickname;
      let group_name = drawing.drawing_group;
      if (!(group_name in groups)) {
        groups[group_name] = [];
      }
      let user = {
        nickname: nickname,
        hash: hash,
        display: 'inherit'
      };
      groups[group_name].push(user);
    }
    let group_names = Object.keys(groups);
    group_names.sort();
    user_display.innerHTML = '';
    let tbody = el('tbody', '', '', {}, user_display);
    for (let group_name of group_names) {
      groups[group_name].sort((a, b) => (a.nickname > b.nickname));
      build_group_elems(groups[group_name], group_name, tbody);
    }
  }
  if (data.note === 'connected') {

  }
  if (data.note === 'update') {

  }
  if (data.note === 'disconnected') {

  }
}


function build_group_elems(group, group_name, tbody) {
  let group_header_tr = el('tr', '', 'bg-secondary', {}, tbody);
  el(
    'button', '&#9634;', 'btn btn-dark btn-outline-secondary text-light',
    {
      'data-group': group_name,
      'data-toggle': 'tooltip',
      'data-display': 'inherit',
      'data-placement': 'top',
      title: '(un)minimize group'
    },
    el('td', '', '', {}, group_header_tr)
  ).onclick = toggle_minimize;
  el('td', group_name, 'text-right', {colspan: 2}, group_header_tr);
  el(
    'button', '&nbsp;o&nbsp;', 'btn btn-outline-secondary btn-dark text-light btn-toggle-group',
    {
      'data-group': group_name,
      'data-display': 'inherit',
      'data-toggle': 'tooltip',
      'data-placement': 'top',
      title: 'show/hide group\'s drawings'
    },
    el('td', '', '', {}, group_header_tr)
  ).onclick = toggle_group;
  for (let user of group) {
    let user_tr = el(
      'tr', '',
      `user-${user.hash}${user.hash === user_id.substr(0, 12) ? ' user-self' : ''} user-row`,
      {
        'data-group': group_name
      },
      tbody
    );
    el('td', '', 'status', {}, user_tr);
    el('td', user.nickname, 'nickname', {}, user_tr);
    el('span', '#' + user.hash.substr(0, 4), 'badge badge-danger bd-dark', {}, el('td', '', '', {}, user_tr));
    el(
      'button', '&nbsp;o&nbsp;',
      `btn btn-outline-secondary btn-dark btn-toggle-user h-${user.hash} text-light`,
      {
        'data-hash': user.hash,
        'data-group': group_name,
        'data-display': 'inherit',
        'data-toggle': 'tooltip',
        'data-placement': 'top',
        title: 'show/hide user\'s drawings'
      },
      el('td', '', '', {}, user_tr)
    ).onclick = toggle_user;
  }
}


function el(type, inner='', classname='', attrs={}, parent=undefined, pos_end=true, before_index=0) {
  let elem = document.createElement(type);
  elem.innerHTML = inner;
  elem.className = classname;
  let attr_keys = Object.keys(attrs);
  for (let key of attr_keys) elem.setAttribute(key, attrs[key]);
  if (parent) {
    if (pos_end) parent.appendChild(elem);
    else {
      if (parent.childNodes.length - 1 < before_index) before_index = childNodex.length - 1;
      let rel_elem = parent.childNodes[before_index];
      parent.insertBefore(elem, rel_elem);
    }
  }
  return elem;
}


function toggle_minimize() {
  let display = toggle_btn(this, null, '&#9634;', '-', '', 'table-row');
  let rows = [].slice.call(document.getElementsByClassName('user-row'));
  let group_name = this.dataset.group;
  rows = rows.filter(r => (r.dataset.group === group_name));
  for (let row of rows) row.style.display = display;
}


function toggle_group(btn=null, display=null, simple=true) {
  if (!('dataset' in btn && 'group' in btn.dataset)) {
    btn = this;
    simple = false;
  }
  let users = groups[btn.dataset.group];
  display = toggle_btn(btn, display);
  if (!simple) {
    for (let user of users) {
      let _btn = document.querySelector('.btn-toggle-user.h-' + user.hash);
      toggle_user(_btn, display);
    }
  }
}


function toggle_user(btn=null, display=null, simple=true) {
  if (!('dataset' in btn && 'hash' in btn.dataset)) {
    btn = this;
    simple = false;
  };
  let group_name = btn.dataset.group;
  display = toggle_btn(btn, display);
  let hash = btn.dataset.hash;
  document.getElementById('board-' + hash).style.display = display;
  let btns = [].slice.call(document.getElementsByClassName('btn-toggle-user'));
  btns = btns.filter(_btn => (_btn.dataset.group === group_name));
  let values = btns.map(_btn => (_btn.dataset.display === 'none'));
  let group_display = values.every(v => v) ? 'none' : 'block';
  if (!simple) {
    let group_btn = [].slice.call(document.getElementsByClassName('btn-toggle-group')).filter(_btn => (
      _btn.dataset.group === group_name
    ))[0];
    toggle_group(group_btn, group_display);
  }
}


function toggle_btn(btn, display=null, a='o', b='&oslash;', c='&nbsp;', v='block') {
  if (display === null) display = btn.dataset.display === 'none' ? v : 'none';
  btn.dataset.display = display;
  if (display === 'none') {
    btn.classList.remove('text-light');
    btn.classList.add('text-secondary');
  }
  else {
    btn.classList.add('text-light');
    btn.classList.remove('text-secondary');
  }
  btn.innerHTML = c + (display === 'none' ? b : a) + c;
  return display;
}
