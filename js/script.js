(function(OC, window, $, undefined) {
	'use strict';

	$(document).ready(function() {

		// this passwords object holds all our passwords
		var Passwords = function(baseUrl) {
			this._baseUrl = baseUrl;
			this._passwords = [];
			this._activePassword = undefined;
		};

		Passwords.prototype = {
			load: function(id) {
				var self = this;
				this._passwords.forEach(function(password) {
					if (password.id === id) {
						password.active = true;
						self._activePassword = password;
					} else {
						password.active = false;
					}
				});
			},
			getActive: function() {
				return this._activePassword;
			},
			removeActive: function() {
				var index;
				var deferred = $.Deferred();
				var id = this._activePassword.id;
				this._passwords.forEach(function(password, counter) {
					if (password.id === id) {
						index = counter;
					}
				});

				if (index !== undefined) {
					// delete cached active password if necessary
					if (this._activePassword === this._passwords[index]) {
						delete this._activePassword;
					}

					this._passwords.splice(index, 1);

					$.ajax({
						url: this._baseUrl + '/' + id,
						method: 'DELETE'
					}).done(function() {
						deferred.resolve();
					}).fail(function() {
						deferred.reject();
					});
				} else {
					deferred.reject();
				}
				return deferred.promise();
			},
			removeByID: function(id) {
				var index = id;
				var deferred = $.Deferred();
				
				if (index !== undefined) {
					// delete cached active password if necessary
					if (this._activePassword === this._passwords[index]) {
						delete this._activePassword;
					}

					this._passwords.splice(index, 1);

					$.ajax({
						url: this._baseUrl + '/' + id,
						method: 'DELETE'
					}).done(function() {
						deferred.resolve();
					}).fail(function() {
						deferred.reject();
					});
				} else {
					deferred.reject();
				}
				return deferred.promise();
			},
			create: function(password) {
				var deferred = $.Deferred();

				$.ajax({
					url: this._baseUrl,
					method: 'POST',
					contentType: 'application/json',
					data: JSON.stringify(password)
				}).done(function(password) {
					deferred.resolve();
				}).fail(function() {
					deferred.reject();
				});
				return deferred.promise();
			},
			getAll: function() {
				return this._passwords;
			},
			loadAll: function() {
				var deferred = $.Deferred();
				var self = this;
				$.get(this._baseUrl).done(function(passwords) {
					self._activePassword = undefined;
					self._passwords = passwords;
					deferred.resolve();
				}).fail(function() {
					deferred.reject();
				});
				return deferred.promise();
			},
			updateActive: function(index, loginname, website, address, pass, notes, deleted) {
				var password = {'id' : index, 'loginname' : loginname, 'website' : website, 'address' : address, 'pass' : pass, 'notes' : notes, 'deleted' : deleted} 
				
				return $.ajax({
					url: this._baseUrl + '/' + password.id,
					method: 'PUT',
					contentType: 'application/json',
					data: JSON.stringify(password)
				});
			}
		};

		// this holds all our passwords, admin and active user
		var Settings = function(baseUrl) {
			this._baseUrl = baseUrl;
			this._settings = [];
		};

		Settings.prototype = {
			load: function() {
				var deferred = $.Deferred();
				var self = this;
				$.ajax({
					url: this._baseUrl,
					method: 'GET',
					async: false
				}).done(function( settings ) {
					self._settings = settings;
				}).fail(function() {
					deferred.reject();
				});
				return deferred.promise();
			},
			getKey: function(key) {
				for (var k in this._settings)
				{
					if (k == key)
						return this._settings[k];
				}
			},
			getAll: function() {
				return this._settings;
			}
		};

		// this will be the view that is used to update the html
		var View = function(passwords) {
			this._passwords = passwords;
		};

		View.prototype = {
			renderContent: function() {
				var source = $('#content-tpl').html();
				var template = Handlebars.compile(source);
				//var html = template({password: this._passwords.getActive()});
				var html = template({
					passwords: this._passwords.getAll()
				});

				$('#PasswordsTableContent tbody').html(html);

				update_pwcount();

				formatTable(false);

				$('#app-settings-content').hide();

				$('td #FieldLengthCheck').mouseenter(function(event) {
					selectElementText(event.target);
				});
				$('td #FieldLengthCheck').mouseleave(function() {
					unselectElementText(this);
				});

				$('#delete_trashbin').click(function() {

					if (!confirm(t('passwords', 'This will permanently delete all passwords in this trash bin.') + "\n\n" + t('passwords', "Are you sure?"))) {
						return false;
						throw new Error();
					}

					var table = document.getElementById('PasswordsTableContent');
					var passwords = new Passwords(OC.generateUrl('/apps/passwords/passwords'));
					for (var i = 1; i < table.rows.length; i++) {
						// check for deleted status (1) and delete
						if (table.rows[i].cells[15].textContent == '1') {
							var db_id = table.rows[i].cells[10].textContent;
					
							passwords.removeByID(db_id).done(function() {
							}).fail(function() {
							});
						}
					}
					location.reload(true);
				});

				$('#PasswordsTableContent td').click(function(event) {
					var table = document.getElementById('PasswordsTableContent');
					var col = $(this).parent().children().index($(this));
					var row = $(this).parent().parent().children().index($(this).parent()) + 1;
					var db_id = table.rows[row].cells[10].textContent;
					var website = table.rows[row].cells[0].textContent;
					var website_old = website;
					var user = table.rows[row].cells[1].textContent;
					var user_old = user;
					var pass = table.rows[row].cells[2].textContent;
					var pass_old = pass;
					var address = table.rows[row].cells[12].textContent;
					var address_old = address;
					var notes = table.rows[row].cells[13].textContent;
					var deleted = table.rows[row].cells[15].textContent;
					var thead = table.rows[0].cells[col].textContent;
					var active_table = $('#app-settings').attr("active-table");
					thead = thead.replace('▴', '');
					thead = thead.replace('▾', '');
					thead = thead.trim();

					if ((event.target.tagName == 'DIV' && (col == 1 || col == 2)) 
						|| (event.target.tagName == 'DIV' && (event.target.className).indexOf('hidevalue') > -1)
						|| event.target.className == 'edit_value' 
						|| col == 13) {
					
						var old_value = table.rows[row].cells[col].textContent;

						if (col == 13 && active_table == 'trashbin') {
							// revert from trash bin to active passwords
							var passwords = new Passwords(OC.generateUrl('/apps/passwords/passwords'));
							var success = passwords.updateActive(db_id, user, website, address, pass, notes, "0");

							if (success) {
								table.rows[row].cells[15].innerHTML = 0;
								formatTable(true);
								update_pwcount();
								alert(t('passwords', 'The password was reverted to the active passwords.'));
							} else {
								alert(t('passwords', 'Error: Could not update password.'));
							}

						} else if (col == 13) {
							// notes
							popUp(t('passwords', 'Notes'), old_value, col, '', website, user);
						} else if (col == 0) {
							popUp(thead, old_value, col, address, website, user);
						} else {
							popUp(thead, old_value, col, '', website, user);
						}
						$('#accept').click(function() {
							var new_value = $('#new_value_popup').val();
							if (col != 13) {
								// Allow to remove notes
								if (new_value == null || new_value == '') {
									$('#overlay').remove();
									$('#popup').remove();
									return false; // on Cancel
								}
							}

							if (col == 0) {
								// clean up website: https://www.Google.com -> google.com
								if ((new_value.substring(0,7).toLowerCase() == 'http://' 
										|| new_value.substring(0,8).toLowerCase() == 'https://'
										|| new_value.substring(0,4).toLowerCase() == 'www.') 
									&& address == '') {
									address = new_value.toLowerCase();
								}
								new_value = strip_website(new_value);
								if (isUrl(new_value)) {
									new_value = new_value.toLowerCase();
								}

								var new_value_address = $('#new_address_popup').val();
								if (new_value_address == null) {
									new_value_address = address; // on Cancel, address not changed
								}
							}
							switch (col) {
								case 0:
									website = new_value;
									address = new_value_address;
									break;
								case 1:
									user = new_value;
									break;
								case 2:
									pass = new_value;
									break;
								case 13:
									notes = new_value;
									break;
							}

							// do the update to the database
							var passwords = new Passwords(OC.generateUrl('/apps/passwords/passwords'));
							var success = passwords.updateActive(db_id, user, website, address, pass, notes, deleted);
							if (success) {
								var innerHTMLtext = table.rows[row].cells[col].textContent;
								table.rows[row].cells[col].innerHTML = innerHTMLtext.replace(old_value, new_value);
								formatTable(true);
							} else {
								alert(t('passwords', 'Error: Could not update password.'));
							}

							$('#overlay').hide();
							$('#popup').hide();

							if ($('#keep_old_popup').prop('checked') == true) {
								// save old pass to trash bin
								var password = {
									website: website_old,
									loginname: user_old,
									address: address_old,
									pass: pass_old,
									notes: notes,
									deleted: "1"
								};

								passwords.create(password).done(function() {

									var passwords2 = new Passwords(OC.generateUrl('/apps/passwords/passwords'));
									var view = new View(passwords2);
									passwords2.loadAll().done(function() {
										view.renderContent();
									});
									

								}).fail(function() {
									alert(t('passwords', 'Error: Could not create password.'));
									return false;
								});

								update_pwcount();
								alert(t('passwords', 'The old value was moved to the trash bin.'));
							}

							// URL needs to be updated; requires reload of page
							if (address != address_old) {
								location.reload(true);				
							}

							$('#overlay').remove();
							$('#popup').remove();
						});
					}

					// clicked on trash, ask confirmation to delete
					if (col == 14) {

						// in active view, move to trash
						if (active_table == 'active') {
							var passwords = new Passwords(OC.generateUrl('/apps/passwords/passwords'));
							var success = passwords.updateActive(db_id, user, website, address, pass, notes, "1");

							if (success) {
								table.rows[row].cells[15].innerHTML = 1;
								formatTable(true);
								update_pwcount();
								alert(t('passwords', 'The password was moved to the trash bin.'));
							} else {
								alert(t('passwords', 'Error: Could not update password.'));
							}
							
						// from trash, remove from database
						} else if (confirm(t('passwords', "This will delete the password for") + " '" + website + "' " + t('passwords', "with user name") + " '" + user + "'.\n\n" + t('passwords', "Are you sure?"))) {

							var passwords = new Passwords(OC.generateUrl('/apps/passwords/passwords'));
							var view = new View(passwords);
							
							passwords.removeByID(db_id).done(function() {
								// now removed from db, 
								// so delete from DOM and update count
								table.deleteRow(row);
								update_pwcount();
							}).fail(function() {
								alert(t('passwords', 'Error: Could not delete password.'));
							});
														
						}
					}

					// share icon
					// if (col == 14) {
					// 	var share_uid = prompt(t('passwords', 'Please enter the username of the user you want to share this password with:'), '');
					// 	if (share_uid != '') {
					// 		alert('will be shared with ' + share_uid);
					// 	}
					// }

				});

								
			},
			renderNavigation: function() {		

				// set settings
				var settings = new Settings(OC.generateUrl('/apps/passwords/settings'));
				settings.load();
				if ((settings.getKey('backup_allowed').toLowerCase() == 'true') == false) {
					// was already hidden with CSS at default for IE7 and lower
					// Now remove it from DOM (doesn't work on IE7 and lower)
					$('#app-settings-backup').remove();
				} else {
					// So show it
					$('#app-settings-backup').show();
				}
				$('#app-settings').attr('days-orange', settings.getKey('days_orange'));
				$('#app-settings').attr('days-red', settings.getKey('days_red'));
				if ((settings.getKey('icons_allowed').toLowerCase() == 'true')) {
					$('#app-settings').attr('icons-show', settings.getKey('icons_show').toLowerCase() == 'true');
					$('#app-settings').attr('icons-service', settings.getKey('icons_service'));
				} else {
					$('#app-settings').attr('icons-show', 'false');
				}
				$('#app-settings').attr('hide-passwords', settings.getKey('hide_passwords').toLowerCase() == 'true');
				$('#app-settings').attr('hide-usernames', settings.getKey('hide_usernames').toLowerCase() == 'true');;
				$('#app-settings').attr('hide-attributes', settings.getKey('hide_attributes').toLowerCase() == 'true');

				// download backup
				$('#backupDL').click(function() {
					backupPasswords();
				});

				// CSV import
				$('#upload_csv').on( "change", function(event) {
					uploadCSV(event);
				});
				$('#app-settings-content').on( "hide", function(event) {
					$('#owncloud-csv').prop('checked', true);
					$('#other-csv-list').hide();
				});
				$('#other-csv').click(function() {
					$('#other-csv-list').show(400);
				});
				$('#owncloud-csv').click(function() {
					// set columns correctly for ownCloud Passwords (this app)
					$('#website-csv').val('1');
					$('#login-csv').val('2');
					$('#password-csv').val('3');
					$('#url-csv').val('4');
					$('#notes-csv').val('5');
					$('#headers-csv').prop('checked', true);
					$('#other-csv-list').hide(400);
				});
				$('#keepass-csv').click(function() {
					// set columns correctly for KeePass CSV 1.x
					$('#website-csv').val('1');
					$('#login-csv').val('2');
					$('#password-csv').val('3');
					$('#url-csv').val('4');
					$('#notes-csv').val('5');
					$('#headers-csv').prop('checked', true);
					$('#other-csv-list').hide(400);
				});
				$('#lastpass-csv').click(function() {
					// set columns correctly for LastPass CSV
					$('#website-csv').val('5');
					$('#login-csv').val('2');
					$('#password-csv').val('3');
					$('#url-csv').val('1');
					$('#notes-csv').val('4');
					$('#headers-csv').prop('checked', true);
					$('#other-csv-list').hide(400);
				});
				$('#onepassword-csv').click(function() {
					// set columns correctly for 1Password
					$('#website-csv').val('1');
					$('#login-csv').val('3');
					$('#password-csv').val('4');
					$('#url-csv').val('2');
					$('#notes-csv').val('5');
					$('#headers-csv').prop('checked', true);
					$('#other-csv-list').hide(400);
				});
				$('#splash-csv').click(function() {
					// set columns correctly for SplashID
					$('#website-csv').val('2');
					$('#login-csv').val('3');
					$('#password-csv').val('4');
					$('#url-csv').val('5');
					$('#notes-csv').val('x');
					$('#headers-csv').prop('checked', true);
					$('#other-csv-list').hide(400);
				});
				$('#other-csv').click(function() {
					// set columns correctly for other
					$('#website-csv').val('1');
					$('#login-csv').val('2');
					$('#password-csv').val('3');
					$('#url-csv').val('4');
					$('#notes-csv').val('x');
					$('#headers-csv').prop('checked', true);
				});

				// clear search field
				$('#search_clear').click(function() {
					$('#search_text').val('');
					$('#search_text').keyup();
				});

				// search function
				$('#search_text').keyup(function() {
					var $rows = $('#PasswordsTableContent tr').not('thead tr');
					var val = $.trim($(this).val()).replace(/ +/g, ' ').toLowerCase();

					// filter
					$rows.show().filter(function() {
						var text = $(this).text().replace(/\s+/g, ' ').toLowerCase();
						return !~text.indexOf(val);
					}).hide();
				});

				// click on other list item
				$('#list_active').click(function() {
					$('#list_active').addClass('active');
					$('#list_trash').removeClass('active');
					$('#app-settings').attr("active-table", 'active');
					$('#cleartrashbin').hide();
					formatTable(true);
					update_pwcount();
				});
				$('#list_trash').click(function() {
					$('#list_active').removeClass('active');
					$('#list_trash').addClass('active');
					$('#app-settings').attr("active-table", 'trashbin');
					formatTable(true);
					update_pwcount();
					if ($(".menu_passwords_trashbin").text() > 0) {
						$('#cleartrashbin').show();
					}
				});

				// clean up website: https://www.Google.com -> google.com
				$('#new_website').focusout(function() {
					if ((this.value.substring(0,7).toLowerCase() == 'http://' 
							|| this.value.substring(0,8).toLowerCase() == 'https://'
							|| this.value.substring(0,4).toLowerCase() == 'www.') 
						&& $('#new_address').val() == '') {
						$('#new_address').val(this.value.toLowerCase());
						$('#new_website').val(strip_website(this.value).toLowerCase());
					} //else {
						//$('#new_website').val(strip_website(this.value).toLowerCase());	
					//}
					
				});
				// try to set a domain entry on website field
				$('#new_address').focusout(function() {
					if ((this.value.substring(0,7).toLowerCase() == 'http://' 
							|| this.value.substring(0,8).toLowerCase() == 'https://'
							|| this.value.substring(0,4).toLowerCase() == 'www.'
							) && $('#new_website').val() == '') {
						$('#new_website').val(URLtoDomain(this.value));
					}
				});

				// create a new password
				var self = this;
				$('#new_password_add').click(function() {

					if ($('#new_username').val() == '' 
						|| $('#new_website').val() == '' 
						|| $('#new_password').val() == '') 
					{
						alert(t('passwords', 'Fill in the website, user name and password.'));
						return false;
					}

					if ($('#new_address').val() != '' 
						&& $('#new_address').val().substring(0,7).toLowerCase() != 'http://' 
						&& $('#new_address').val().substring(0,8).toLowerCase() != 'https://'
						&& $('#new_address').val().substring(0,4).toLowerCase() != 'www.') 
					{
						if (isUrl($('#new_address').val())) {
							// valid ULR, so add http
							$('#new_address').val('http://' + $('#new_address').val());
							// now check if valid
							if (!isUrl($('#new_address').val())) {
								alert(t('passwords', 'Fill in a valid URL in the first field.') + '\n\n' + t('passwords', 'Note: This field is optional and can be left blank.'));
								$('#new_address').select();
								return false;
							}
						} else {
							alert(t('passwords', 'Fill in a valid URL in the first field.') + '\n\n' + t('passwords', 'Note: This field is optional and can be left blank.'));
							$('#new_address').select();
							return false;
						}
					}

					var password = {
						website: $('#new_website').val(),
						loginname: $('#new_username').val(),
						address: $('#new_address').val(),
						pass: $('#new_password').val(),
						notes: $('#new_notes').val(),
						deleted: "0"
					};

					self._passwords.create(password).done(function() {

						$('#new_username').val('');
						$('#new_website').val('');
						$('#new_password').val('');
						$('#new_address').val('');
						$('#new_notes').val('');
						$('#generate_strength').text('');
						$('#generate_passwordtools').fadeOut(250);
						$('#gen_length').val('25');

						var passwords = new Passwords(OC.generateUrl('/apps/passwords/passwords'));
						var view = new View(passwords);
						passwords.loadAll().done(function() {
							var create_success = true;
							view.renderContent();
						});

						update_pwcount();

					}).fail(function() {
						alert(t('passwords', 'Error: Could not create password.'));
						return false;
					});

				});

				// calculate strength
				$("#new_password").keyup(function() {
					strength_str(this.value, false);
				});

				// select whole password when entering field
				$('#new_password').click(function() {
					this.select();
				});

				// generate password
				$('#new_generate').click(function() {
					var popup_exist = ($('#gen_length_popup').val() > 0)

					if (!popup_exist) {
						// show options
						$('#generate_passwordtools').fadeIn(500);
						document.getElementById('generate_passwordtools').scrollIntoView();
					}

					var lower_checked = $('#gen_lower').prop('checked');
					var upper_checked = $('#gen_upper').prop('checked');
					var numbers_checked = $('#gen_numbers').prop('checked');
					var special_checked = $('#gen_special').prop('checked');
					var length_filled = $('#gen_length').val();
					var generate_new = '';

					if (!isNumeric(length_filled) || length_filled.length == 0 || length_filled < 4) {
						alert(t('passwords', 'Fill in a valid number as length with a minimum of 4.'));
						return false;
					}
					if (!lower_checked && !upper_checked && !numbers_checked && !special_checked) {
						alert(t('passwords', 'Select at least one option to generate a password.'));
						return false;
					}

					// run
					generate_new = generatepw(lower_checked, upper_checked, numbers_checked, special_checked, length_filled);
					
					// calculate strength
					strength_str(generate_new, false);

					// fill in
					if (popup_exist) {
						$('#new_value_popup').val(generate_new);
						$("#generate_strength").text('');
						$('#generate_passwordtools').hide();
					} else {
						$('#new_password').val(generate_new);
					}
				});

			},
			render: function() {
				this.renderNavigation();
				this.renderContent();
			}
		};


		var passwords = new Passwords(OC.generateUrl('/apps/passwords/passwords'));
		var view = new View(passwords);
		passwords.loadAll().done(function() {
			view.render();
		}).fail(function() {
			alert(t('passwords', 'Error: Could not load passwords.'));
		});

	});


})(OC, window, jQuery);

function isNumeric(n) {
	return !isNaN(parseFloat(n)) && isFinite(n);
}
function strHasLower(str) {
	return str.toUpperCase() != str;
}
function strHasUpper(str) {
	return str.toLowerCase() != str;
}
function strHasNumber(str) {
	var regex = /\d/g;
	return regex.test(str);
}
function strHasSpecial(str) {

	var number;

	for (i = 0; i < str.length; i++) {
	
		number = 0;
		number = str.substring(i, i + 1).charCodeAt(0);

		switch(true) {
			case number === 33:
			case number >= 35 && number <= 36:
			case number === 38:
			case number >= 40 && number <= 41:
			case number === 43:
			case number >= 45 && number <= 47:
			case number >= 58 && number <= 60:
			case number >= 62 && number <= 64:
			case number === 95:
				return true;
				break;
		}

	}

	// no special chars
	return false;
	
}

function formatTable(update_only) {

	var table = document.getElementById('PasswordsTableContent');

	if (table != null) {

		var has_lower;
		var has_upper;
		var has_number;
		var has_special;

		var active_table = $('#app-settings').attr("active-table");

		var hide_attributes = $('#app-settings').attr("hide-attributes");
		if (hide_attributes == 'false') {
			$('.hide_attributes').removeClass('hide_attributes');
		}

		for (var i = 1; i < table.rows.length; i++) {

			// set table for active passwords or trash bin
			if (active_table == 'active' && table.rows[i].cells[15].textContent == 1
			|| active_table == 'trashbin' && table.rows[i].cells[15].textContent == 0) {
				table.rows[i].className = 'hide_always';
			} else {
				table.rows[i].className = '';
			}

			for (var j = 0; j < table.rows[i].cells.length; j++)

				if (hide_attributes != 'true') {

					var fieldPassword = table.rows[i].cells[2].textContent;
					if(strHasLower(fieldPassword)) {
						table.rows[i].cells[5].textContent = t('passwords', 'Yes');
						table.rows[i].cells[5].className = 'green';
					} else {
						table.rows[i].cells[5].textContent = t('passwords', 'No');
						table.rows[i].cells[5].className = 'red';
					}
					if(strHasUpper(fieldPassword)) {
						table.rows[i].cells[6].textContent = t('passwords', 'Yes');
						table.rows[i].cells[6].className = 'green';
					} else {
						table.rows[i].cells[6].textContent = t('passwords', 'No');
						table.rows[i].cells[6].className = 'red';
					}
					if(strHasNumber(fieldPassword)) {
						table.rows[i].cells[7].textContent = t('passwords', 'Yes');
						table.rows[i].cells[7].className = 'green';
					} else {
						table.rows[i].cells[7].textContent = t('passwords', 'No');
						table.rows[i].cells[7].className = 'red';
					}
					if(strHasSpecial(fieldPassword)) {
						table.rows[i].cells[8].textContent = t('passwords', 'Yes');
						table.rows[i].cells[8].className = 'green';
					} else {
						table.rows[i].cells[8].textContent = t('passwords', 'No');
						table.rows[i].cells[8].className = 'red';
					}
				}

				// strength
				var pass_str = table.rows[i].cells[2].textContent;
				var strength_int = strength_func(pass_str);
				table.rows[i].cells[3].textContent = strength_int;
				table.rows[i].cells[3].textContent = t('passwords', strength_str(pass_str, true)) + ' (' + strength_int + ')';
				table.rows[i].cells[3].setAttribute('sorttable_customkey', 1 / strength_int);
				switch (strength_str(pass_str, true)) {
					case t('passwords', 'Weak'):
						table.rows[i].cells[3].className = 'red';
						table.rows[i].cells[2].className += ' red';
						break;
					case t('passwords', 'Moderate'):
						table.rows[i].cells[3].className = 'orange';
						table.rows[i].cells[2].className += ' orange';
						break;
					case t('passwords', 'Strong'):
						table.rows[i].cells[3].className = 'green';
						table.rows[i].cells[2].className += ' green';
						break;
				}

				// length
				var length;
				length = table.rows[i].cells[2].textContent.length;
				table.rows[i].cells[4].textContent = length;
				table.rows[i].cells[4].setAttribute('sorttable_customkey', 1 / length);

				// date
				var dateToday = new Date();
				
				var dateText = table.rows[i].cells[9].textContent;
				if (dateText.indexOf(" ") != -1) {
					var dateThis = table.rows[i].cells[9].getAttribute('sorttable_customkey');

					table.rows[i].cells[9].textContent = 
						dateThis.substring(0, 4)
						+ '-' + dateThis.substring(4, 6)
						+ '-' + dateThis.substring(6, 8);
				}
				table.rows[i].cells[9].setAttribute('sorttable_customkey', '');

				var datePart = table.rows[i].cells[9].textContent.split('-');
				var dateRowEntry = new Date(table.rows[i].cells[9].textContent);
				// colourize date
				var days_orange = $('#app-settings').attr("days-orange");
				var days_red = $('#app-settings').attr("days-red");
				var diffInDays = Math.floor((dateToday - dateRowEntry) / (1000*60*60*24));
				var thisClass = table.rows[i].cells[3].className;
				if(diffInDays > days_red - 1) {
					table.rows[i].cells[9].className += ' red'; // default: > 365 days
					table.rows[i].cells[2].className += ' red'; // force red colour on password
				} else if(diffInDays > days_orange - 1) {
					table.rows[i].cells[9].className += ' orange'; // default: 150-364 days
					if (thisClass == 'green') {
						table.rows[i].cells[2].className += ' orange'
					}
				} else if(diffInDays < days_orange) {
					table.rows[i].cells[9].className += ' green'; // < default: 150 days
				}

				var language = $('html').attr('lang');

				switch (diffInDays) {
					case 0:
						table.rows[i].cells[9].setAttribute('title', t('passwords', 'today'));
						break;
					case 1:
						if (language == 'es') {
							table.rows[i].cells[9].setAttribute('title', 'hace ' + diffInDays + ' ' + t('passwords', 'day ago'));
						} else if (language == 'ca') {
							table.rows[i].cells[9].setAttribute('title', 'fa ' + diffInDays + ' ' + t('passwords', 'day ago'));
						} else {
							table.rows[i].cells[9].setAttribute('title', diffInDays + ' ' + t('passwords', 'day ago'));
						}
						break;
					default:
						if (language == 'es') {
							table.rows[i].cells[9].setAttribute('title', 'hace ' + diffInDays + ' ' + t('passwords', 'days ago'));
						} else if (language == 'ca') {
							table.rows[i].cells[9].setAttribute('title', 'fa ' + diffInDays + ' ' + t('passwords', 'days ago'));
						} else {
							table.rows[i].cells[9].setAttribute('title', diffInDays + ' ' + t('passwords', 'days ago'));
						}
				}

				// sort correctly (YYYYMMDD)
				var YYYYMMDD = datePart[0].toString() + datePart[1].toString() + datePart[2].toString();
				table.rows[i].cells[9].setAttribute('sorttable_customkey', YYYYMMDD);

				var Month;
				switch (Math.floor(datePart[1])) {
					case 1:
						Month = t('passwords', 'January');
						break;
					case 2:
						Month = t('passwords', 'February');
						break;
					case 3:
						Month = t('passwords', 'March');
						break;
					case 4:
						Month = t('passwords', 'April');
						break;
					case 5:
						Month = t('passwords', 'May');
						break;
					case 6:
						Month = t('passwords', 'June');
						break;
					case 7:
						Month = t('passwords', 'July');
						break;
					case 8:
						Month = t('passwords', 'August');
						break;
					case 9:
						Month = t('passwords', 'September');
						break;
					case 10:
						Month = t('passwords', 'October');
						break;
					case 11:
						Month = t('passwords', 'November');
						break;
					case 12:
						Month = t('passwords', 'December');
						break;
				}

				if (language == 'en') {
					// format: 14th March 2011, most Brittish according to https://www.englishclub.com/vocabulary/time-date.htm
					var suffix;
					switch (Math.floor(datePart[2])) {
						case 1:
						case 21:
						case 31:
							suffix = 'st';
							break;
						case 2:
						case 22:
							suffix = 'nd';
							break;
						case 3:
						case 23:
							suffix = 'rd';
							break;
						default:
							suffix = 'th';
							break;
					}
					table.rows[i].cells[9].innerHTML = Math.floor(datePart[2]) + '<sup>' + suffix + '</sup> ' + Month + ' ' + datePart[0];
				} else if (language == 'nl') {
					// Dutch: 14 maart 2015
					table.rows[i].cells[9].innerHTML = Math.floor(datePart[2]) + ' ' + Month + ' ' + datePart[0];
				} else if (language == 'de') {
					// German: 14. März 2015
					table.rows[i].cells[9].innerHTML = Math.floor(datePart[2]) + '. ' + Month + ' ' + datePart[0];
				} else if (language == 'es') {
					// Spanish: 14 de marzo de 2015
					table.rows[i].cells[9].innerHTML = Math.floor(datePart[2]) + ' de ' + Month + ' de ' + datePart[0];
				} else if (language == 'ca') {
					// Catalan: 14 de març de 2015
					if ((Month[0] == 'a') || (Month[0] == 'o')) {
						table.rows[i].cells[9].innerHTML = Math.floor(datePart[2]) + ' d\'' + Month + ' de ' + datePart[0];
					} else {
						table.rows[i].cells[9].innerHTML = Math.floor(datePart[2]) + ' de ' + Month + ' de ' + datePart[0];
					}

				} else {
					// all others: March 14, 2015
					table.rows[i].cells[9].innerHTML = Month + ' ' + Math.floor(datePart[2]) + ', ' + datePart[0];
				}

				table.rows[i].cells[9].innerHTML = "<span>" + table.rows[i].cells[9].innerHTML + "</span>";

				var cellWebsite = table.rows[i].cells[0];
				var cellWebsiteURL = table.rows[i].cells[12];
				var cellUsername = table.rows[i].cells[1];
				var cellPassword = table.rows[i].cells[2];

				// clickable website
				if(isUrl(cellWebsite.textContent) || cellWebsiteURL.textContent != '') {
					// set real website url if available
					if (cellWebsiteURL.textContent != '') {
						var websiteURL = cellWebsiteURL.textContent;
					} else {
						var websiteURL = 'http://' + cellWebsite.textContent;
					}
					cellWebsite.className += ' is_website';
					var icons_show = $('#app-settings').attr("icons-show");
					if (icons_show == 'true') {
						var icons_service = $('#app-settings').attr("icons-service");
						if (icons_service == 'ddg') { // DuckDuckGo
							cellWebsite.innerHTML = '<a href="' + websiteURL + '" target="_blank"><img class="websitepic" src="https://icons.duckduckgo.com/ip2/' + cellWebsite.textContent + '.ico">' + cellWebsite.textContent + '</a>';
						}
						if (icons_service == 'ggl') { // Google
							cellWebsite.innerHTML = '<a href="' + websiteURL + '" target="_blank"><img class="websitepic" src="https://www.google.com/s2/favicons?domain=' + cellWebsite.textContent + '">' + cellWebsite.textContent + '</a>';
						}
					} else {
						cellWebsite.innerHTML = '<a href="' + websiteURL + '" target="_blank">' + cellWebsite.textContent + '</a>';
					}
				} else { // no valid website url
					cellWebsite.className = '';
					cellWebsite.innerHTML = cellWebsite.textContent; // or else doesn't align very well
				}

				cellWebsiteURL = ''; // reset

				table.rows[i].cells[13].className = 'icon-notes';
				table.rows[i].cells[13].removeAttribute("style");

				
				// hide username and/or password according to user settings
				var hide_usernames = $('#app-settings').attr("hide-usernames");
				var hide_passwords = $('#app-settings').attr("hide-passwords");
				if (hide_usernames == 'true') {
					cellUsername.className += ' hidevalue';
				}
				if (hide_passwords == 'true') {
					cellPassword.className += ' hidevalue';
				}

				// escape HTML to cope with usernames and passwords containing < or >
				table.rows[i].cells[1].textContent = escapeHTML(table.rows[i].cells[1].textContent);
				table.rows[i].cells[2].textContent = escapeHTML(table.rows[i].cells[2].textContent);
				if (active_table == 'active') {
					var imgNotes = OC.linkTo('passwords', 'img/notes.svg');
					cellWebsite.innerHTML = cellWebsite.innerHTML + '<img class="edit_value" src="' + imgNotes.replace('index.php/', '') + '">';
					if ((cellUsername.innerHTML).indexOf('<img class="edit_value"') == -1 ) {
						cellUsername.innerHTML = '<div id="FieldLengthCheck">' + cellUsername.textContent + '</div><img class="edit_value" src="' + imgNotes.replace('index.php/', '') + '">';
					}
					if ((cellPassword.innerHTML).indexOf('<img class="edit_value"') == -1 ) {
						cellPassword.innerHTML = '<div id="FieldLengthCheck">' + cellPassword.textContent + '</div><img class="edit_value" src="' + imgNotes.replace('index.php/', '') + '">';
					}

					// move text to span when available (so it will be hidden)
					if (table.rows[i].cells[13].textContent != '') {
						table.rows[i].cells[13].innerHTML = '<span>' + table.rows[i].cells[13].textContent + '</span>';
						table.rows[i].cells[13].style.opacity = 1;
					} else {
						table.rows[i].cells[13].className += ' actual-note';
					}

				} else {
					// trash bin
					cellUsername.innerHTML = '<div id="FieldLengthCheck">' + cellUsername.textContent + '</div>';
					cellPassword.innerHTML = '<div id="FieldLengthCheck">' + cellPassword.textContent + '</div>';
					
					// revert icon
					table.rows[i].cells[13].className = 'icon-history';
				}

				
			
				// shared password
				// var oc_user = $('head').attr("data-user");
				// if (table.rows[i].cells[11].textContent != oc_user) {
				// 	table.rows[i].cells[12].innerHTML = ' (' + t('passwords', 'from') + ' ' + table.rows[i].cells[11].textContent + ')';
				// 	table.rows[i].cells[12].colSpan = "2";
				// 	table.rows[i].cells[13].className = '';
				// 	table.rows[i].cells[12].className = '';
				// }

				

		}

		// sort on website, reset sort first
		// if (update_only) {
		// 	$('#column_website').click();	
		// }

	}
}

function strength_func(Password) {

	var charInStr;
	var strength_calc;
	var passwordLength;
	var hasLowerCase;
	var hasUpperCase;
	var hasNumber;
	var hasSpecialChar1;
	var hasSpecialChar2;
	var hasSpecialChar3;
	var hasSpecialChar4;
	var charInt;
 
	passwordLength = Password.length;

	strength_calc = 0;

	// check length
	switch(true) {
		case passwordLength >= 8:
			//strength_calc = 1;
			break;
		case passwordLength <= 4:
			// password smaller than 5 chars is always bad
			return 0;
			break;
	}

	// loop ONCE through password
	for (i = 1; i < passwordLength + 1; i++) {
		
		charInStr = Password.slice(i, i + 1);
		charInt = charInStr.charCodeAt(0);

		switch(true) {
			case charInt >= 97 && charInt <= 122:
				if (!hasLowerCase) {
					strength_calc = strength_calc + 1;
					hasLowerCase = true;
				}
				break;
			case charInt >= 65 && charInt <= 90:
				if (!hasUpperCase) {
					strength_calc = strength_calc + 1;
					hasUpperCase = true;
				}
				break;
			case charInt >= 48 && charInt <= 57:
				if (!hasNumber) {
					strength_calc = strength_calc + 1;
					hasNumber = true;
				}
				break;
			case charInt >= 33 && charInt <= 47:
				if (!hasSpecialChar1) {
					strength_calc = strength_calc + 1;
					hasSpecialChar1 = true;
				}
				break;
			case charInt >= 58 && charInt <= 64:
				if (!hasSpecialChar2) {
					strength_calc = strength_calc + 1;
					hasSpecialChar2 = true;
				}
				break;
			case charInt >= 91 && charInt <= 96:
				if (!hasSpecialChar3) {
					strength_calc = strength_calc + 1;
					hasSpecialChar3 = true;
				}
				break;
			case charInt >= 123 && charInt <= 255:
				if (!hasSpecialChar4) {
					strength_calc = strength_calc + 1;
					hasSpecialChar4 = true;
				}
				break;
		}

	}
	
	strength_calc = strength_calc + (Math.floor(passwordLength / 8) * ((hasLowerCase ? 1 : 0) + (hasUpperCase ? 1 : 0) + (hasNumber ? 1 : 0) + (hasSpecialChar1 ? 1 : 0) + (hasSpecialChar2 ? 1 : 0) + (hasSpecialChar3 ? 1 : 0) + (hasSpecialChar4 ? 1 : 0)));
	
	var power = 6;
	strength_calc = strength_calc + Math.round(Math.pow(passwordLength, power) / Math.pow(10, power + 1));

	return strength_calc;

}

function generatepw(lower, upper, number, special, length_chars) {

	var length_calc = Math.floor(length_chars / (lower + upper + number + special));

	var Wlower = "";
	var Wupper = "";
	var Wnumber = "";
	var Wspecial = "";

	if (lower) {
		Wlower = random_characters(0, length_calc);
	}
	if (upper) {
		Wupper = random_characters(1, length_calc);
	}
	if (number) {
		Wnumber = random_characters(2, length_calc);
	}
	if (special) {
		Wspecial = random_characters(3, length_calc);
	}

	var ww = "" + Wlower + Wupper + Wnumber + Wspecial;

	// e.g. length 27 with all 4 options = 6 char for every option (24) so 3 remaining
	// so fill up, starting with special, then number, then upper, then lower:
	var difference = length_chars - length_calc * (lower + upper + number + special);
	if (special) {
		ww = ww + random_characters(3, difference);
	} else if (number) {
		ww = ww + random_characters(2, difference);
	} else if (upper) {
		ww = ww + random_characters(1, difference);
	} else if (lower) {
		ww = ww + random_characters(0, difference);
	}

	// do a Fisher-Yates shuffle
	var a = ww.split("");
	var n = a.length;

	for (var i = n - 1; i > 0; i--) {
		var j = Math.floor(Math.random() * (i + 1));
		var tmp = a[i];
		a[i] = a[j];
		a[j] = tmp;
	}

	ww = a.join("");

	return ww;

}

function random_characters(char_kind, size_wanted) {

	var allowed = "";
	var text = "";

	switch (char_kind) {
		// No | l I 1 B 8 0 O o due to reading ability
		case 0:
			allowed = "abcdefghijkmnpqrstuvwxyz";
			break;
		case 1:
			allowed = "ACDEFGHJKLMNPQRSTUVWXYZ";
			break;
		case 2:
			allowed = "2345679";
			break;
		case 3:
			allowed = "!@#$%^&*()_+~[]{}:;?><,./-=";
			break;
	}

	for (var i = 0; i < size_wanted; i++)
	text += allowed.charAt(Math.floor(Math.random() * allowed.length));

	return text;
}

function strength_str(passw, return_string_only) {

	if (!return_string_only) {
		if (passw == '') { 
			$("#generate_strength").text(''); 
			return false;
		}

		$("#generate_strength").removeClass("red");
		$("#generate_strength").removeClass("orange");
		$("#generate_strength").removeClass("green");
	}
	
	switch (strength_func(passw)) {
		case 0:
		case 1:
		case 2:
		case 3:
		case 4:
		case 5:
		case 6:
		case 7:
			if (return_string_only) { return t('passwords', 'Weak'); }
			$("#generate_strength").text(t('passwords', 'Strength') + ': ' + t('passwords', 'Weak').toLowerCase() + ' (' + strength_func(passw) + ')');
			$("#generate_strength").addClass("red");
			break;
		case 8:
		case 9:
		case 10:
		case 11:
		case 12:
		case 13:
		case 14:
			if (return_string_only) { return t('passwords', 'Moderate'); }
			$("#generate_strength").text(t('passwords', 'Strength') + ': ' + t('passwords', 'Moderate').toLowerCase() + ' (' + strength_func(passw) + ')');
			$("#generate_strength").addClass("orange");
			break;
		default: // everything >= 15
			if (return_string_only) { return t('passwords', 'Strong'); }
			$("#generate_strength").text(t('passwords', 'Strength') + ': ' + t('passwords', 'Strong').toLowerCase() + ' (' + strength_func(passw) + ')');
			$("#generate_strength").addClass("green");
	}

	$("#generate_strength_popup").text($("#generate_strength").text());
	$("#generate_strength_popup").attr("class", $("#generate_strength").attr("class"));

}

function update_pwcount() {

	$("#emptycontent").hide();
	$("#emptytrashbin").hide();
	$("#PasswordsTable").show();

	var table = document.getElementById('PasswordsTableContent');
	var active = 0;
	var trash = 0;

	for (var i = 1; i < table.rows.length; i++) {
		if (table.rows[i].cells[15].textContent == '0') {
			active = active + 1;
		}
		if (table.rows[i].cells[15].textContent == '1') {
			trash = trash + 1;
		}
	}

	$(".menu_passwords_active").text(active);
	$(".menu_passwords_trashbin").text(trash);

	if ($('#app-settings').attr('active-table') == 'active' && active == 0) {
		$("#emptycontent").show();
		$("#PasswordsTable").hide();
	}

	if ($('#app-settings').attr('active-table') == 'trashbin' && trash == 0) {
		$("#emptytrashbin").show();
		$("#PasswordsTable").hide();
	}

}
function escapeHTML(text) {
	return text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
function isUrl(url) {

	// not starting with a whitespace char or / or $ or . or ? or #
	// overall no spaces allowed
	// at least 1 char before and 2 chars after a dot
	// test for ^[^\s/$.?#]\S{1,}\.[a-z]{2,}$
	url = url.toLowerCase();
	var strRegex = '^[^\\s/$.?#]\\S{1,}\\.[a-z]{2,}$';

	var re = new RegExp(strRegex);

	return re.test(url);
}
function strip_website(website) {

	var convert = website;

	if (!isUrl(website)) {
		return website;
	}
	
	if (convert.substr(0, 8) == "https://") {
		convert = convert.substr(8, convert.length - 8);
	};

	if (convert.substr(0, 7) == "http://") {
		convert = convert.substr(7, convert.length - 7);
	};
	
	if (convert.substr(0, 4) == "www.") {
		convert = convert.substr(4, convert.length - 4);
	};

	return convert;
}
function URLtoDomain(website) {

	var domain;
	// remove protocol (http, ftp, etc.) and get domain
	if (website.indexOf("://") > -1) {
		domain = website.split('/')[2];
	}
	else {
		domain = website.split('/')[0];
	}

	// remove port number
	domain = domain.split(':')[0];

	// remove unwanted wwww. for sorting purposes
	if (domain.substr(0, 4) == "www.") {
		domain = domain.substr(4, domain.length - 4);
	};

	return domain;
}
function markRow(row) {
	var rows = $('tr', $('#PasswordsTableContent'));
	rows.eq(row).animate( { backgroundColor: '#ffa' }, 400, function() {
		$(this).animate( { backgroundColor: 'none' }, 3000);
	});
}

function backupPasswords() {

	// No support in IE
	if (navigator.userAgent.indexOf('MSIE') !== -1 || navigator.appVersion.indexOf('Trident/') > 0) {
		alert(t('passwords', 'This function is unsupported on your browser. Use a modern browser instead.'));
		return false;
	}

	if (!confirm(t('passwords', 'This will download an unencrypted backup file, which contains all your passwords.') + '\n' + t('passwords', 'This file is fully compatible with other password services, such as KeePass, 1Password and LastPass.') + '\n\n' + t('passwords', "Are you sure?"))) {
		return false;
	}

	var d = new Date();
	var textToWrite = '"Website","Username","Passwords","FullAddress","Notes",""\r\n';
	var rowValue;

	var table = document.getElementById('PasswordsTableContent');
	for (var i = 1; i < table.rows.length; i++) {
		for (var j = 0; j < table.rows[i].cells.length; j++)


			if (j == 0 || j == 1 || j == 2 || j == 12 || j == 13) { // columns: website, username, pass, address, notes
				rowValue = table.rows[i].cells[j].textContent;
				// escape " and \ by putting a \ before them
				rowValue = rowValue.replace('"', '\\"').replace('\\', '\\\\');
				textToWrite += '"' + rowValue + '",';
			}

			textToWrite += '""\r\n';

	}

	var textFileAsBlob = new Blob([textToWrite], {type:'text/plain'});
	var d = new Date();

	// filename as YYYYMMDD_backup.txt
	var fileNameToSaveAs = d.getFullYear()
						 + ('0' + (d.getMonth() + 1)).slice(-2)
						 + ('0' + d.getDate()).slice(-2)
						 + '_backup.csv';

	var downloadLink = document.createElement("a");
	downloadLink.download = fileNameToSaveAs;
	downloadLink.innerHTML = "Download File";
	
	if (window.webkitURL != null) {
		// Chrome allows the link to be clicked
		// without actually adding it to the DOM.
		downloadLink.href = window.webkitURL.createObjectURL(textFileAsBlob);
	} else {
		// Firefox requires the link to be added to the DOM
		// before it can be clicked.
		downloadLink.href = window.URL.createObjectURL(textFileAsBlob);
		downloadLink.onclick = destroyClickedElement;
		downloadLink.style.display = "none";
		document.body.appendChild(downloadLink);
	}

	downloadLink.click();
	downloadLink = '';

	// collapse settings part in navigation pane
	$('#app-settings-content').hide();

}
function destroyClickedElement(event) {
	document.body.removeChild(event.target);
}
function uploadCSV(event) {

	if (!(window.File && window.FileReader && window.FileList && window.Blob)) {
		alert(t('passwords', 'This function is unsupported on your browser. Use a modern browser instead.'));
		return false;
	}

	//Retrieve the first (and only!) File from the FileList object
	var f = event.target.files[0]; 

	if (!f) {
		alert('No file loaded');
		$('#upload_csv').replaceWith($('#upload_csv').clone(true).val(''));
		return false;
	} else 
		// validate file
		if (f.name.substr(f.name.length - 4, 4).toLowerCase() != '.csv') {
		InvalidCSV(t('passwords', 'Only files with CSV as file extension are allowed.'));
	} else {
		var r = new FileReader();
		
		r.onload = function(event) { 
			var contents = event.target.result;

			var headersCSV = $('#headers-csv').prop('checked');
			if (headersCSV) {
				var headerCount = 1;
			} else {
				var headerCount = 0;
			}

			var count = (contents.match(/\r\n/g) || []).length + 1 - headerCount;

			if (count < 1) {
				InvalidCSV(t('passwords', 'This file contains no passwords.'));
			}

			var lines = contents.split('\r\n');

			for (i = headerCount; i < lines.length; i++) {
				// i = 1 with headers, so skip i = 0 (headers tested before)

				// loop once to check if all lines contain at least 3 values
				
				if (lines[i] != '') {
					if (lines[i].substr(0, 1) != '"') {
						InvalidCSV(t('passwords', 'This file contains one or more values without quotation marks.'));
					}
					var line = lines[i].split('","');
					if (line.length < 3) {
						InvalidCSV(t('passwords', 'This file contains one or more lines with less than 3 columns.'));
					}
					// line is "value1","value2","value3"
					// and thus cut first and last '"'
					lines[i] = lines[i].substr(1, lines[i].trim().length - 2);
				} else {
					count = count - 1;
				}
			}

			var count_str;
			if (count == 1) {
				count_str = t('passwords', 'Password').toLowerCase()
			} else {
				count_str = t('passwords', 'Passwords').toLowerCase()
			}
			var confirmed = confirm(t('passwords', 'The following file will be imported') + ':' 
						+ '\n\n'
						+ t('passwords', 'Name') + ': ' + f.name + '\n'
						+ t('passwords', 'Size') + ': ' + f.size + ' bytes\n'
						+ t('passwords', 'Content') + ': ' + count + ' ' + count_str);

			if (confirmed) {

				for (i = headerCount; i < lines.length; i++) {

					if (lines[i] != '') {

						var line = lines[i].split('","');

						var loginCSV = '';
						var websiteCSV = '';
						var urlCSV = '';
						var passwordCSV = '';
						var notesCSV = '';

						if ($('#website-csv').val().toLowerCase() != 'x') {
							var websiteCSV = line[$('#website-csv').val() - 1];
						}
						if ($('#login-csv').val().toLowerCase() != 'x') {
							var loginCSV = line[$('#login-csv').val() - 1];
						}
						if ($('#password-csv').val().toLowerCase() != 'x') {
							var passwordCSV = line[$('#password-csv').val() - 1];
						}
						if ($('#url-csv').val().toLowerCase() != 'x') {
							var urlCSV = line[$('#url-csv').val() - 1];
						}
						if ($('#notes-csv').val().toLowerCase() != 'x') {
							var notesCSV = line[$('#notes-csv').val() - 1];
						}

						urlCSV = urlCSV.toLowerCase();

						// validate URL, must have protocol like http(s)						
						if (urlCSV != '' 
							&& urlCSV.substring(0,7).toLowerCase() != 'http://' 
							&& urlCSV.substring(0,8).toLowerCase() != 'https://') 
						{
							if (isUrl(urlCSV)) {
								// valid ULR, so add http
								urlCSV = 'http://' + urlCSV;
								// now check if valid
								if (!isUrl(urlCSV)) {
									alert(t('passwords', 'This is not a valid URL, so this value will not be saved:') + '\n' + urlCSV);
									urlCSV = '';
								}
							} else {
								alert(t('passwords', 'This is not a valid URL, so this value will not be saved:') + '\n' + urlCSV);
								urlCSV = '';
							}
						}

						// unescape " and \ by deleting the \ before them
						passwordCSV = passwordCSV.replace('\\"', '"').replace('\\\\', '\\');
						var password = {
							website : websiteCSV,
							loginname : loginCSV,
							address : urlCSV,
							pass : passwordCSV,
							notes : notesCSV,
							deleted : "0"
						};

						// add them one at the time
						var success = $.ajax({
								url: OC.generateUrl('/apps/passwords/passwords'),
								method: 'POST',
								contentType: 'application/json',
								data: JSON.stringify(password)
							});

						if (success) {
						} else {
							alert(t('passwords', 'Error: Could not create password.') 
								+ '\n\n'
								+ t('passwords', 'Website or company') + ': ' + websiteCSV + '\n'
								+ t('passwords', 'Full URL (optional)') + ': ' + urlCSV + '\n'
								+ t('passwords', 'Login name') + ': ' + loginCSV + '\n'
								+ t('passwords', 'Password') + ': ' + passwordCSV + '\n'
								+ t('passwords', 'Notes') + ':\n' + notesCSV);
						}
					}
				}	

				alert(t('passwords', 'Import of passwords done. This page will now reload.'));
				location.reload(true);

			}
			
		}
		r.readAsText(f); // = execute

	}

	$('#upload_csv').replaceWith($('#upload_csv').clone(true).val(''));

}
function InvalidCSV(error_description) {
	$('#upload_csv').replaceWith($('#upload_csv').clone(true).val(''));
	alert(t('passwords', 'This is not a valid CSV file.') + ' ' 
		+ error_description);
	throw new Error('Error: ' + error_description);
}

function popUp(title, value, column, address_value, website, username) {
	$('<div/>', {id: 'overlay'}).appendTo($('#app'));	
	$('<div/>', {id: 'popup'}).appendTo($('#app'));	
	$('<div/>', {id: 'popupTitle'}).appendTo($('#popup'));	
	$('<span/>', {text:website}).appendTo($('#popupTitle'));
	$('<br/>').appendTo($('#popupTitle'));
	$('<span/>', {text:t('passwords', 'Login name') + ': ' + username, id:"popupSubTitle"}).appendTo($('#popupTitle'));

	$('<div/>', {id: 'popupContent'}).appendTo($('#popup'));	
	$('<p/>', {text:t('passwords', 'Enter a new value and press Save to keep the new value.\nThis cannot be undone.')}).appendTo($('#popupContent'));
	$('<br/>').appendTo($('#popupContent'));
	$('<p/>', {text:title + ':'}).appendTo($('#popupContent'));
	if (column == 13) {
		$('<textarea/>', {id:"new_value_popup", rows:"5"}).val(value).appendTo($('#popupContent'));
	} else {
		$('<input/>', {type:'text', id:"new_value_popup", autocorrect:'off', autocapitalize:'off', spellcheck:'false'}).val(value).appendTo($('#popupContent'));
		if (column == 2) {
			$('<p id="generate_strength_popup"></p>').appendTo($('#popupContent'));
			
			$('<input>', {type:'checkbox', id:"gen_lower_popup"}).prop("checked", $('#gen_lower').is(":checked")).appendTo($('#popupContent'));
			$('<label/>', {for:'gen_lower_popup',text:t('passwords', 'Lowercase characters')}).appendTo($('#popupContent'));
			$('<br/>').appendTo($('#popupContent'));
			
			$('<input>', {type:'checkbox', id:"gen_upper_popup"}).prop("checked", $('#gen_upper').is(":checked")).appendTo($('#popupContent'));
			$('<label/>', {for:'gen_upper_popup',text:t('passwords', 'Uppercase characters')}).appendTo($('#popupContent'));
			$('<br/>').appendTo($('#popupContent'));
			
			$('<input>', {type:'checkbox', id:"gen_numbers_popup"}).prop("checked", $('#gen_numbers').is(":checked")).appendTo($('#popupContent'));
			$('<label/>', {for:'gen_numbers_popup',text:t('passwords', 'Numbers')}).appendTo($('#popupContent'));
			$('<br/>').appendTo($('#popupContent'));
			
			$('<input>', {type:'checkbox', id:"gen_special_popup"}).prop("checked", $('#gen_special').is(":checked")).appendTo($('#popupContent'));
			$('<label/>', {for:'gen_special_popup',text:t('passwords', 'Punctuation marks')}).appendTo($('#popupContent'));
			$('<br/>').appendTo($('#popupContent'));
			
			$('<input/>', {type:'text', id:"gen_length_popup", value:$('#gen_length').val()}).appendTo($('#popupContent'));
			$('<label/>', {text:t('passwords', 'characters')}).appendTo($('#popupContent'));
			$('<br/>').appendTo($('#popupContent'));
			
			$('<button/>', {id:'new_generate_popup', text:t('passwords', 'Generate password')}).appendTo($('#popupContent'));	
			$('<br/>').appendTo($('#popupContent'));

		} else if (column == 0) {
			$('<br/><br/>').appendTo($('#popupContent'));
			$('<p/>', {text:t('passwords', 'Full URL (optional)') + ':'}).val(address_value).appendTo($('#popupContent'));
			$('<input/>', {type:'text', id:"new_address_popup", autocorrect:'off', autocapitalize:'off', spellcheck:'false'}).val(address_value).appendTo($('#popupContent'));
		}

		if (column == 0 || column == 1 || column == 2) {
			$('<input>', {type:'checkbox', id:"keep_old_popup"}).prop("checked", 'true').appendTo($('#popupContent'));
			$('<label/>', {for:'keep_old_popup', id:"keep_old_popuplbl", text:t('passwords', 'Move old value to trash bin')}).appendTo($('#popupContent'));
		}

	}

	$('<div/>', {id: 'popupButtons'}).appendTo($('#popup'));	
	$('<button/>', {id:'cancel', text:t('passwords', 'Cancel')}).appendTo($('#popupButtons'));
	$('<button/>', {id:'accept', text:t('passwords', 'Save')}).appendTo($('#popupButtons'));

	// Popup
	$('#overlay').click(function() {
		$('#overlay').remove();
		$('#popup').remove();
	});
	$('#cancel').click(function() {
		$('#overlay').remove();
		$('#popup').remove();
	});
	if (column == 2) {
		strength_str($("#new_value_popup").val(), false);
		$('#generate_strength').text('');
		$('#generate_passwordtools').hide();

		$("#new_value_popup").keyup(function() {
			strength_str(this.value, false);
			$('#generate_strength').text('');
		});
		$('#gen_lower_popup').change(function() {
			$('#gen_lower').prop("checked", $('#gen_lower_popup').is(":checked"));
		});
		$('#gen_upper_popup').change(function() {
			$('#gen_upper').prop("checked", $('#gen_upper_popup').is(":checked"));
		});
		$('#gen_numbers_popup').change(function() {
			$('#gen_numbers').prop("checked", $('#gen_numbers_popup').is(":checked"));
		});
		$('#gen_special_popup').change(function() {
			$('#gen_special').prop("checked", $('#gen_special_popup').is(":checked"));
		});
		$('#gen_length_popup').change(function() {
			$('#gen_length').val($('#gen_length_popup').val());
		});
		$('#new_generate_popup').click(function() {
			$('#new_generate').click();
		});
	}

	// no focus, to annoying for iPad and iPhone
	// $('#new_value_popup').focus();
	// $('#new_value_popup').select();

	// align to vertical center
	var popupHeight = document.getElementById('popup').clientHeight;
	var browserHeight = Math.max(
		document.body.scrollHeight, document.documentElement.scrollHeight,
		document.body.offsetHeight, document.documentElement.offsetHeight,
		document.body.clientHeight, document.documentElement.clientHeight
	);
	if (browserHeight > popupHeight) {
		document.getElementById("popup").style.top = (browserHeight - popupHeight) / 4 + "px";	
	}
	
}
function selectElementText(el, win) {
	el.focus();
	win = win || window;
	var doc = win.document, sel, range;
	if (win.getSelection && doc.createRange) {
		sel = win.getSelection();
		range = doc.createRange();
		range.selectNodeContents(el);
		sel.removeAllRanges();
		sel.addRange(range);
	} else if (doc.body.createTextRange) {
		range = doc.body.createTextRange();
		range.moveToElementText(el);
		range.select();
	}
	var copyText;
	if (navigator.userAgent.toLowerCase().indexOf("android") == -1
	&& navigator.userAgent.toLowerCase().indexOf("iphone")  == -1
	&& navigator.userAgent.toLowerCase().indexOf("ipad")  == -1
	&& navigator.userAgent.toLowerCase().indexOf("ipod")  == -1) {
		if (navigator.userAgent.toLowerCase().indexOf("mac os x") == -1) {
			copyText = 'Ctrl+C';
		} else {
			copyText = '\u2318+C'; //Cmd-logo + C
		}
		$('#notification').css('display', 'inline-block');
		$('#notification').text((t('passwords', 'Press %s to copy this selected value to clipboard')).replace('%s', copyText));
	}
}
function unselectElementText(el) {
	$('#notification').css('display', 'none');
	$('#new_password').click();
}
