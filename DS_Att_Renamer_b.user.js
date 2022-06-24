// ==UserScript==
// @name        DS_Att_Renamer
// @namespace   de.die-staemme
// @version     0.5.2
// @description Dieses Script benennt alle x Minuten alle neuen Angriffe automatisch um.
// @grant       GM_getValue
// @grant       GM_setValue
// @grant       unsafeWindow
// @match       https://*.die-staemme.de/game.php?*screen=overview_villages*
// @include     https://*.die-staemme.de/game.php?*screen=overview_villages*
// @include     https://*.die-staemme.de/game.php?*screen=info_command&id=*&AR=*
// @copyright   2015+, the stabel, git
// @downloadURL https://github.com/st4bel/staemmescripte/blob/master/DS_Att_Renamer.js
// ==/UserScript==


/*
 * V 0.1: Beginn der Implementierung
 * V 0.2: Umbenennen nach eigenen vorstellungen. -> Rückkehrzeit
 * V 0.2.1: bugfixing / renaming gefixt
 * V 0.2.2: bugfixing / Aufruf des Renamers
 * V 0.3: Einfügen eines Einstellungs-Fensters
 * V 0.3.1: Anpassen an Staemmeupdate
 * V 0.4: Nur begrenzte Zahl an Angriffen gleichzeitig einfügen
 * V 0.5: Umbennen in Spielername und Koordinaten
 * V 0.5.1: auswählen des intervalls, in dem die umbennenungs-fenster geöffnet werden
 * V 0.5.2: bugfix
 */
var $ = typeof unsafeWindow != 'undefined' ? unsafeWindow.$ : window.$;
var _Anleitungslink = "http://blog.ds-kalation.de/?p=61";
var unit_speed = {
	"Späher": 9,
	"LKAV": 10,
	"SKAV": 11,
	"Axtkämpfer": 18,
	"Schwertkämpfer": 22,
	"Ramme": 30,
	"AG": 35
};
var _config = {
	"debug": false,
	"max_number_tabs": 5
}

$(function() {
	var storage = localStorage;
	var storagePrefix = "Att_Renamer_v5_2_";
	//Speicherfunktionen
	function storageGet(key, defaultValue) {
		var value = storage.getItem(storagePrefix + key);
		return (value === undefined || value === null) ? defaultValue : value;
	}
	
	function storageSet(key, val) {
		storage.setItem(storagePrefix + key, val);
	}
	
	storageSet("running", storageGet("running", "0"));
	storageSet("refresh_intervall", storageGet("refresh_intervall", 10));
	storageSet("opening_intervall", storageGet("opening_intervall", 3));
	storageSet("show_returntime", storageGet("show_returntime", "0"));
	storageSet("alarm", storageGet("alarm", "0"));
	storageSet("show_playername", storageGet("show_playername", "0"));
	storageSet("show_koords", storageGet("show_koords", "0"));
	storageSet("fake", storageGet("fake", "0"));
	storageSet("rename_templates", storageGet("rename_templates", '{"<-f":"Fake:"}'));
	storageSet("config", storageGet("config", JSON.stringify(_config)))
	//storageSet("rename_templates",'{"<-f":"Fake:"}');
	
	init_UI();
	//Prüft in Tabelle .modmenu, ob "Eintreffend" ausgewählt ist.
	var mode = $(".selected", $(".modemenu"));
	if ($("a", mode).eq(0).text().indexOf("Eintreffend") != -1 && storageGet("running") == "1") {
		//Prüf Routine starten
		start_running();
	}
	//script öffnet zum Umbenennen einen neuen Tab, dieser ist mit dem php-Parameter "AR=1" gekennzeichnet.
	if (getPageAttribute("AR") == "1") {
		//benennt den aktuellen Angriff aufgrund der verfügbaren Daten auf der Seite screen=info_command&id=--attack_id--
		window.blur()
		renaming();
	}
	if (getPageAttribute("AR") != "0") {
		//benennt den aktuellen Angriff aufgrund der verfügbaren Daten auf der Seite screen=info_command&id=--attack_id--
		window.blur()
		//fake_renaming();
	}
	
	function renaming() {
		add_log("function: renaming()")
		$(".rename-icon").click();
		//finden der Zelle mit "Ankunft in:"
		var duration_cell;
		$("td").each(function() {
			if ($(this).text().indexOf("Ankunft in:") != -1) {
				duration_cell = $(this).next();
				duration_cell.css("background-color", "green");
			}
		});
		
		var duration = $(duration_cell).text();
		var pos_min = duration.indexOf(":");
		var pos_sec = duration.indexOf(":", pos_min + 1);
		//in sec
		var duration = parseInt(duration.substring(0, pos_min)) * 3600 + parseInt(duration.substring(
			pos_min + 1, pos_sec)) * 60 + parseInt(duration.substring(pos_sec + 1, duration
			.length));
		add_log("duration = " + duration)
		//Berechnung der Distanz aufgrund der start und zielkoordinaten auf screen=info_command
		var distance = getDistance2();
		add_log("distance = " + distance)
		//Ermittlung der möglichen Einheit.
		//im spiel werden die Laufzeiten auf sekunden (echt) gerundet.
		var unit_duration = {};
		var unit = "";
		var diff;
		var best_diff = "null";
		for (var name in unit_speed) {
			unit_duration[name] = unit_speed[name] * 60 * distance;
			diff = unit_duration[name] - duration;
			if (diff > 0 && (diff < best_diff || best_diff == "null")) {
				unit = name;
				best_diff = diff;
			}
		}
		add_log("best_diff = " + best_diff)
		var attackname = "";
		var returntime = "";
		var playername = "";
		var koords = "";
		//Wenn die Rückkehr angezeigt werden soll.
		if (storageGet("show_returntime") == "1") {
			var cell;
			$("td").each(function(index) {
				if ($(this).text().indexOf("Ankunft:") != -1) {
					cell = $(this).next();
				}
			});
			var ankunft = cell.text();
			var ankunft_time = new Date(
				parseInt(20 + ankunft.substring(6, 8)), //y
				parseInt(ankunft.substring(3, 5)) - 1, //m
				parseInt(ankunft.substring(0, 2)), //d
				parseInt(ankunft.substring(9, 11)), //h
				parseInt(ankunft.substring(12, 14)), //min
				parseInt(ankunft.substring(15, 17)), //s
				0);
			var rueckkehr_time = ankunft_time;
			rueckkehr_time.setSeconds(rueckkehr_time.getSeconds() + Math.floor(unit_duration[unit]));
			returntime = "; Rückkehr: " + rueckkehr_time.toString().substring(4, rueckkehr_time
				.toString().indexOf("GMT"));
		}
		if (storageGet("show_playername") == "1") {
			var cell = [];
			(function findcell() { //finde erste Zelle mit "Spieler:"
				$("td", $("#content_value")).each(function(index) {
					if ($(this).text().indexOf("Spieler:") != -1) {
						cell[index] = $(this).next();
					}
				});
			})();
			for (var i in cell) {
				playername = "; " + cell[i].text();
				break;
			}
		}
		if (storageGet("show_koords") == "1") {
			var cell = [];
			(function findcell() { //finde erste Zelle mit "Spieler:"
				$("td", $("#content_value")).each(function(index) {
					if ($(this).text().indexOf("Dorf:") != -1) {
						cell[index] = $(this).next();
					}
				});
			})();
			for (var i in cell) {
				koords = "; " + cell[i].text();
				break;
			}
		}
		
		var attackname = unit + playername + koords + returntime;
		add_log("attackname = " + attackname)
		$('[type="text"]').val(attackname);
		$(".btn").click();
		add_log("renaming complete! closing tab...")
		setTimeout(function() {
			window.close();
		}, 500);
	}
	
	function fake_renaming() {
		add_log("function fake_renaming()")
		$(".rename-icon").click();
		var attackname = getPageAttribute("AR") + " " + $('[type="text"]').val();
		$('[type="text"]').val(attackname);
		$(".btn").click();
		setTimeout(function() {
			window.close();
		}, 10);
	}
	
	function start_running() {
		add_log("function start_running()")
		var table = $("#incomings_table");
		var rows = $("tr", table).slice(1);
		add_log("detected " + rows.length + " rows")
		var row;
		var new_Attack = false;
		var counter = 0;
		for (var i = 0; i < rows.length; i++) {
			add_log("checking row " + i)
			row = rows[i];
			var cell = $("td", row).eq(0);
			var duration_cell = $("td", row).eq(-1);
			//Wenn Ankommender Angriff noch "Angriff" heißt, also noch nicht umbenannt wurde..
			if ($("span.quickedit-label", cell).text().indexOf("Angriff") != -1) {
				add_log("found new Attack in row " + i + "; counter = " + counter)
				//$('[type="checkbox"]',cell).click();
				cell.css("background-color", "yellow");
				new_Attack = true;
				var link = $("a", cell).attr("href") + "&AR=1";
				if (counter < JSON.parse(storageGet("config")).max_number_tabs) {
					add_log("opening renamer Tab..")
					//setTimeout(function() {
					window.open(link, '_blank');
					//}, 1 * 1000);
				}
				counter++;
			}
			//Einfärben der letzten Zelle, wenn Angriff in weniger als 10 min ankommt
			if ($("span", duration_cell).text().substring(0, 3).indexOf("0:0") != -1) {
				duration_cell.css("background-color", "yellow");
				if (parseInt($("span", duration_cell).text().substring(3, 4)) < 5) {
					duration_cell.css("background-color", "red");
				}
			}
			//Einfügen aller Vorlagen
			if (storageGet("fake") == "1") {
				var templates = JSON.parse(storageGet("rename_templates"));
				for (var template in templates) {
					$("span.quickedit-content", cell).append(
						$("<a>")
						.text(template + " ")
						.attr("AR", templates[template])
						.click(function() {
							//alert("What is love? "+$(this).attr("data-id"));
							var fake_span = $("span.quickedit[data-id|='" + $(this).attr(
								"data-id") + "']");
							var link = $("a", fake_span).attr("href") + "&AR=" + $(this).attr(
								"AR");
							window.open(link, '_blank');
						})
						.attr("href", "#")
						.attr("data-id", $("span.quickedit", cell).attr("data-id"))
					);
				}
			}
		}
		var t = getPageAttribute("t") != "0" ? "&t=" + getPageAttribute("t") : "";
		//Urlaubsvertretung t=sitter_id
		if (counter >= JSON.parse(storageGet("config")).max_number_tabs) {
			//wenn mehr als 5 angriffe, mache 5s pause, sonst blokierte anfragen
			setTimeout(function() {
				add_log("trying to reload")
				location.href =
					"/game.php?screen=overview_villages&mode=incomings&subtype=attacks" + t;
			}, percentage_randomInterval(storageGet("opening_intervall") * 1000, 5));
		}
		//letzte aktualisierung
		if ($("th", table).eq(0).text().indexOf("zuletzt aktualisiert") == -1) {
			$("th", table).eq(0).text($("th", table).eq(0).text() + " zuletzt aktualisiert: " + $(
				"#serverTime").text());
		}
		add_log("waiting for page-reload")
		if (storageGet("running") == "1") {
			setTimeout(function() {
				location.href =
					"/game.php?screen=overview_villages&mode=incomings&subtype=attacks" + t;
			}, percentage_randomInterval(storageGet("refresh_intervall") * 60000, 5));
		}
	}
	
	function getDistance2() {
		//on screen=info_command
		//extracts start and destination village coords and calculates their distance in fields
		//uses function distanceTo
		var koords = {};
		$(".village_anchor").each(function(index) {
			koords[index] = $("a", $(this)).eq(0).text();
			var last;
			while (koords[index].indexOf("(") != -1) {
				last = koords[index];
				koords[index] = koords[index].substring(koords[index].indexOf("(") + 1,
					koords[index].length);
			}
			koords[index] = last.substring(last.indexOf("(") + 1, last.indexOf(")"));
		});
		return distanceTo(koords["0"], koords["1"]);
	}
	
	function getDistance(row) {
		//Zielkoordinaten
		var target_string = $("a", $("td", row).eq(1)).text();
		target_string = target_string.substring(target_string.indexOf("("), target_string.length);
		//letzte "Klammer Auf" finden
		var last;
		while (target_string.indexOf("(") != -1) {
			last = target_string;
			target_string = target_string.substring(target_string.indexOf("(") + 1, target_string
				.length);
		}
		target_string = last.substring(last.indexOf("(") + 1, last.indexOf(")"));
		
		var origin_string = $("a", $("td", row).eq(2)).text();
		origin_string = origin_string.substring(origin_string.indexOf("("), origin_string.length);
		//letzte "Klammer Auf" finden
		var last;
		while (origin_string.indexOf("(") != -1) {
			last = origin_string;
			origin_string = origin_string.substring(origin_string.indexOf("(") + 1, origin_string
				.length);
		}
		origin_string = last.substring(last.indexOf("(") + 1, last.indexOf(")"));
		
		var distance = Math.floor(distanceTo(target_string, origin_string) * 10);
		return distanceTo(target_string, origin_string); //distance/10
	}
	
	function distanceTo(koords1, koords2) {
		//returns distance in fields
		//coords have to be in format x*x|y*y
		var pos_trenn1 = koords1.indexOf("|");
		var pos_trenn2 = koords2.indexOf("|");
		return Math.sqrt(Math.pow(parseInt(koords1.substring(0, pos_trenn1)) - parseInt(koords2
			.substring(0, pos_trenn2)), 2) + Math.pow(parseInt(koords1.substring(pos_trenn1 +
			1, koords1.length)) - parseInt(koords2.substring(pos_trenn2 + 1, koords2
			.length)), 2));
	}
	
	function init_UI() {
		var eintreffend_menu;
		$("a", $(".modemenu").eq(0)).each(function() {
			var link = $(this).attr("href");
			if (link.indexOf("mode=incomings") != -1) {
				eintreffend_menu = $(this).parent();
			}
		});
		
		$("<span>")
			.attr("id", "att_renamer_running")
			.on("click", function() {
				storageSet("running", storageGet("running") == "1" ? "0" : "1");
				toogle_icon(storageGet("running"));
			})
			.appendTo(eintreffend_menu);
		
		toogle_icon(storageGet("running"));
		
		function toogle_icon(setTo) {
			var icon = $("#att_renamer_running");
			if (setTo == "1") {
				icon
					.attr("class", "icon friend online")
					.attr("title", "Att_Renamer aktiviert");
			} else {
				icon
					.attr("class", "icon friend offline")
					.attr("title", "Att_Renamer deaktiviert");
			}
		}
		
		var button_Einstellungen = $("<button>")
			.text("Einstellungen")
			.click(function() {
				toggleSettingsVisibility();
			})
			.attr("class", "btn")
			.appendTo(eintreffend_menu);
		
		var settingsDivVisible = false;
		var overlay = $("<div>")
			.css({
				"position": "fixed",
				"z-index": "99999",
				"top": "0",
				"left": "0",
				"right": "0",
				"bottom": "0",
				"background-color": "rgba(255,255,255,0.6)",
				"display": "none"
			})
			.appendTo($("body"));
		var settingsDiv = $("<div>")
			.css({
				"position": "fixed",
				"z-index": "100000",
				"left": "50px",
				"top": "50px",
				"width": "400px",
				"height": "400px",
				"background-color": "white",
				"border": "1px solid black",
				"border-radius": "5px",
				"display": "none",
				"padding": "10px"
			})
			.appendTo($("body"));
		
		function toggleSettingsVisibility() {
			if (settingsDivVisible) {
				overlay.hide();
				settingsDiv.hide();
			} else {
				overlay.show();
				settingsDiv.show();
			}
			
			settingsDivVisible = !settingsDivVisible;
		}
		
		var settingsTable = $("<table>").appendTo(settingsDiv);
		
		$("<button>").text("Schließen").click(function() {
			toggleSettingsVisibility();
		}).appendTo(settingsDiv);
		$("<button>").text("Anleitung").click(function() {
			window.open(_Anleitungslink, '_blank');
		}).appendTo(settingsDiv);
		
		function addRow(desc, content) {
			$("<tr>")
				.append($("<td>").append(desc))
				.append($("<td>").append(content))
				.appendTo(settingsTable);
		}
		
		var input_refresh_intervall = $("<input>")
			.attr("type", "text")
			.val(storageGet("refresh_intervall"))
			.on("input", function() {
				storageSet("refresh_intervall", parseInt($(this).val()));
				console.log("new refresh Time: " + storageGet("refresh_intervall") + " min");
			});
		var input_opening_intervall = $("<input>")
			.attr("type", "text")
			.val(storageGet("opening_intervall"))
			.on("input", function() {
				storageSet("opening_intervall", parseInt($(this).val()));
				console.log("new opening Time: " + storageGet("opening_intervall") + " s");
			});
		var input_max_tabs = $("<input>")
			.attr("type", "text")
			.val(JSON.parse(storageGet("config")).max_number_tabs)
			.on("input", function() {
				config = JSON.parse(storageGet("config"))
				config.max_number_tabs = parseInt($(this).val())
				storageSet("config", JSON.stringify(config))
				console.log("new max_number_tabs " + JSON.parse(storageGet("config"))
					.max_number_tabs);
			})
		
		var select_show_returntime = $("<select>")
			.append($("<option>").text("Ja").attr("value", 1))
			.append($("<option>").text("Nein").attr("value", 0))
			.change(function() {
				storageSet("show_returntime", $("option:selected", $(this)).val());
				console.log("Set 'show_returntime' to: " + storageGet("show_returntime"));
			});
		$("option[value=" + storageGet("show_returntime") + "]", select_show_returntime).prop(
			"selected", true);
		
		var select_show_playername = $("<select>")
			.append($("<option>").text("Ja").attr("value", 1))
			.append($("<option>").text("Nein").attr("value", 0))
			.change(function() {
				storageSet("show_playername", $("option:selected", $(this)).val());
				console.log("Set 'show_playername' to: " + storageGet("show_playername"));
			});
		$("option[value=" + storageGet("show_playername") + "]", select_show_playername).prop(
			"selected", true);
		
		var select_show_koords = $("<select>")
			.append($("<option>").text("Ja").attr("value", 1))
			.append($("<option>").text("Nein").attr("value", 0))
			.change(function() {
				storageSet("show_koords", $("option:selected", $(this)).val());
				console.log("Set 'show_koords' to: " + storageGet("show_koords"));
			});
		$("option[value=" + storageGet("show_koords") + "]", select_show_koords).prop("selected",
			true);
		
		var select_alarm = $("<select>")
			.append($("<option>").text("Ja").attr("value", 1))
			.append($("<option>").text("Nein").attr("value", 0))
			.change(function() {
				storageSet("alarm", $("option:selected", $(this)).val());
				console.log("Set 'alarm' to: " + storageGet("alarm"));
			});
		$("option[value=" + storageGet("alarm") + "]", select_alarm).prop("selected", true);
		
		var select_fake = $("<select>")
			.append($("<option>").text("Ja").attr("value", 1))
			.append($("<option>").text("Nein").attr("value", 0))
			.change(function() {
				storageSet("fake", $("option:selected", $(this)).val());
				console.log("Set 'fake' to: " + storageGet("fake"));
			});
		
		var select_rename_template = $("<select>")
			.change(function() {
				var templates = JSON.parse(storageGet("rename_templates"));
				input_template_value.val(templates[$("option:selected", select_rename_template)
					.val()]);
			});
		var templates = JSON.parse(storageGet("rename_templates"));
		for (var template in templates) {
			$("<option>").text(template).attr("value", template).appendTo(select_rename_template);
		}
		var input_template_value = $("<input>").attr("type", "text")
			.val(templates[$("option:selected", select_rename_template).val()])
			.on("input", function() {
				var templates = JSON.parse(storageGet("rename_templates"));
				templates[$("option:selected", select_rename_template).val()] = $(this).val();
				storageSet("rename_templates", JSON.stringify(templates));
				console.log(JSON.stringify(templates));
			});
		var input_new_template = $("<input>").attr("type", "text")
			.val("Anzeigename");
		
		var button_new_template = $("<button>")
			.text("Speichern")
			.click(function() {
				var templates = JSON.parse(storageGet("rename_templates"));
				templates[input_new_template.val()] = "new";
				storageSet("rename_templates", JSON.stringify(templates));
				console.log(templates);
				$("<option>").text(input_new_template.val()).attr("value", "new").appendTo(
					select_rename_template);
			});
		var button_delete_template = $("<button>")
			.text("Löschen")
			.click(function() {
				var templates = JSON.parse(storageGet("rename_templates"));
				delete templates[$("option:selected", select_rename_template).val()];
				storageSet("rename_templates", JSON.stringify(templates));
				console.log(templates);
				$('option[value="' + select_rename_template.val() + '"]').remove();
				input_template_value.val(templates[$("option:selected", select_rename_template)
					.val()]);
			});
		
		$("<tr>").append($("<td>").attr("colspan", 2).append($("<span>").attr("style",
			"font-weight: bold;").text("Allgemein:"))).appendTo(settingsTable);
		addRow(
			$("<span>").text("Aktualisierung alle x Minuten: "),
			input_refresh_intervall);
		addRow(
			$("<span>").text("Alle x sek. Neue Fenster öffnen: "),
			input_opening_intervall);
		addRow(
			$("<span>").text("Maximale Anzahl Tabs (default 5): "),
			input_max_tabs);
		
		addRow(
			$("<span>").text("Rückkehrzeit anzeigen?"),
			select_show_returntime);
		addRow(
			$("<span>").text("Spielernamen anzeigen?"),
			select_show_playername);
		addRow(
			$("<span>").text("Koordinaten anzeigen?"),
			select_show_koords);
		addRow(
			$("<span>").text(
				"Warnsystem, wenn Angriff bis zur \nnächsten Aktualisierung ankommt:"),
			select_alarm);
		
		$("<tr>").append($("<td>").attr("colspan", 2).append($("<span>").attr("style",
			"font-weight: bold;").text("Umbenennungsvorlagen Verwalten:"))).appendTo(
			settingsTable);
		addRow(
			$("<span>").text("Umbenennungsvorlagen anzeigen:"),
			select_fake);
		addRow($("<span>").text("Anzeigename"), select_rename_template);
		addRow($("<span>").text("Umbennen in: x + alter Name:"), input_template_value);
		addRow($("<span>").text("Ausgewählte Vorlage Löschen:"), button_delete_template);
		$("<tr>").append($("<td>").attr("colspan", 2).append($("<span>").attr("style",
			"font-weight: bold;").text("Neue Vorlage erstellen:"))).appendTo(settingsTable);
		addRow(input_new_template, button_new_template);
	}
	
	function randomInterval(min, max) {
		return Math.floor(Math.random() * (max - min + 1)) + min;
	}
	
	function percentage_randomInterval(average, deviation) {
		average = parseInt(average);
		deviation = deviation > 100 ? 1 : deviation / 100;
		return randomInterval(average * (1 + deviation), average * (1 - deviation));
	}
	
	function getPageAttribute(attribute) {
		//gibt den Screen zurück, also z.B. von* /game.php?*&screen=report*
		//wenn auf confirm-Seite, dann gibt er "confirm" anstatt "place" zurück
		//return: String
		var params = document.location.search;
		var value = params.substring(params.indexOf(attribute + "=") + attribute.length + 1, params
			.indexOf("&", params.indexOf(attribute + "=")) != -1 ? params.indexOf("&", params
				.indexOf(attribute + "=")) : params.length);
		return params.indexOf(attribute + "=") != -1 ? value : "0";
	}
	
	function timeConverter(timestamp) {
		var a = new Date(timestamp);
		var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov',
			'Dec'
		];
		var year = a.getFullYear();
		var month = months[a.getMonth()];
		var date = a.getDate();
		var hour = a.getHours();
		var min = a.getMinutes();
		var sec = a.getSeconds();
		var time = date + ' ' + month + ' ' + year + ' ' + hour + ':' + min + ':' + sec;
		return time;
	}
	
	function add_log(text) {
		if (JSON.parse(storageGet("config")).debug !== "false") {
			var prefix = storagePrefix + timeConverter(Date.now()) + " - ";
			console.log(prefix + text);
		}
	}
	
});