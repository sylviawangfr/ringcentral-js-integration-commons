'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.AllContactSourceName = undefined;
exports.addPhoneToContact = addPhoneToContact;
exports.uniqueContactItems = uniqueContactItems;
exports.sortContactItemsByName = sortContactItemsByName;
exports.groupByFirstLetterOfName = groupByFirstLetterOfName;
exports.filterContacts = filterContacts;

var _isBlank = require('./isBlank');

var _isBlank2 = _interopRequireDefault(_isBlank);

var _normalizeNumber = require('./normalizeNumber');

var _normalizeNumber2 = _interopRequireDefault(_normalizeNumber);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var AllContactSourceName = exports.AllContactSourceName = 'all';

function addPhoneToContact(contact, phone, type) {
  var phoneNumber = (0, _normalizeNumber2.default)({ phoneNumber: phone });
  if ((0, _isBlank2.default)(phoneNumber)) {
    return;
  }
  var existedPhone = contact.phoneNumbers.find(function (number) {
    return number && number.phoneNumber === phone;
  });
  if (existedPhone) {
    existedPhone.phoneType = type;
  } else {
    contact.phoneNumbers.push({
      phoneNumber: phone,
      phoneType: type
    });
  }
}

function uniqueContactItems(result) {
  var items = result || [];
  // remove duplicated referencing
  items = items.filter(function (value, index, arr) {
    return arr.indexOf(value) === index;
  });
  // remove duplicated items by id
  var hash = {};
  var unique = [];
  items.forEach(function (item) {
    var itemId = '' + item.type + item.id;
    if (!hash[itemId]) {
      hash[itemId] = 1;
      unique.push(item);
    }
  });
  return unique;
}

var NON_ALPHABET_RE = /[^a-z]/i;
function sortContactItemsByName(result) {
  var items = result || [];
  items.sort(function (a, b) {
    var name1 = (a.name || '').toLowerCase().replace(/^\s\s*/, ''); // trim start
    var name2 = (b.name || '').toLowerCase().replace(/^\s\s*/, ''); // trim start
    var isNumber1 = /^[0-9]/.test(name1);
    var isNumber2 = /^[0-9]/.test(name2);
    // Empty string should be put at the end
    if (name1.length <= 0 || name2.length <= 0) {
      return -name1.localeCompare(name2);
    }
    if (isNumber1 && isNumber2) {
      return name1.localeCompare(name2);
    }
    if (isNumber1 || isNumber2) {
      // put number name at last
      return -name1.localeCompare(name2);
    }
    if (NON_ALPHABET_RE.test(name1[0]) && !NON_ALPHABET_RE.test(name2[0])) {
      return 1;
    }
    if (!NON_ALPHABET_RE.test(name1[0]) && NON_ALPHABET_RE.test(name2[0])) {
      return -1;
    }
    return name1.localeCompare(name2);
  });
  return items;
}

var POUND_SIGN = '#';
function groupByFirstLetterOfName(contactItems) {
  var groups = [];
  if (contactItems && contactItems.length) {
    var group = void 0;
    contactItems.forEach(function (contact) {
      var name = (contact.name || '').replace(/^\s\s*/, ''); // trim start
      var letter = null;
      if (name.length <= 0 || NON_ALPHABET_RE.test(name[0])) {
        letter = POUND_SIGN;
      } else {
        letter = (name[0] || '').toLocaleUpperCase();
      }
      if (!group || group.caption !== letter) {
        group = {
          contacts: [],
          caption: letter,
          id: letter
        };
        groups.push(group);
      }
      group.contacts.push(contact);
    });
  }
  return groups;
}

function filterContacts(contacts, searchFilter) {
  var items = contacts;
  if (!searchFilter || (0, _isBlank2.default)(searchFilter)) {
    return items;
  }
  var searchText = searchFilter.toLowerCase();
  return items.filter(function (item) {
    var name = item.firstName + ' ' + item.lastName;
    if (name.toLowerCase().indexOf(searchText) >= 0 || item.extensionNumber && item.extensionNumber.indexOf(searchText) >= 0 || item.phoneNumbers && item.phoneNumbers.find(function (x) {
      return x.phoneNumber.indexOf(searchText) >= 0;
    })) {
      return true;
    }
    return false;
  });
}
//# sourceMappingURL=contactHelper.js.map