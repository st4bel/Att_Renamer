// ==UserScript==
// @name        DS_Att_Renamer
// @namespace   de.die-staemme
// @version     0.22/08.03.16
// @description Dieses Script benennt alle x Minuten alle neuen Angriffe automatisch um.
// @grant       GM_getValue
// @grant       GM_setValue
// @grant       unsafeWindow
// @match       https://*.die-staemme.de/game.php?*screen=overview_villages*
// @include     https://*.die-staemme.de/game.php?*screen=overview_villages*
// @include     https://*.die-staemme.de/game.php?*screen=info_command&id=*&AR=1
// @copyright   2015+, the stabel, git
// @downloadURL https://github.com/st4bel/staemmescripte/blob/master/DS_Att_Renamer.js
// ==/UserScript==


/*
 * V 0.10: Beginn der Implementierung
 * V 0.20: Umbenennen nach eigenen vorstellungen. -> Rückkehrzeit
 * V 0.21: bugfixing / renaming gefixt
 * V 0.22: bugfixing / Aufruf des Renamers
 * V 0.30: einfügen eines Einstellungs-Fensters
 */
 
 var $ = typeof unsafeWindow != 'undefined' ? unsafeWindow.$ : window.$;
 
 var unit_speed = {"Späher":9,"LKAV":10,"SKAV":11,"Axtkämpfer":18,"Schwertkämpfer":22,"Ramme":30,"AG":35};
 
 $(function(){
	var storage = localStorage;
    var storagePrefix="Att_Renamer_";
    //Speicherfunktionen
    function storageGet(key,defaultValue) {
        var value= storage.getItem(storagePrefix+key);
        return (value === undefined || value === null) ? defaultValue : value;
    }
    function storageSet(key,val) {
        storage.setItem(storagePrefix+key,val);
    }
	
	storageSet("running",storageGet("running","0"));
	storageSet("refresh_intervall",storageGet("refresh_intervall",10));
	storageSet("show_returntime",storageGet("show_returntime","0"));
	storageSet("alarm",storageGet("alarm","0"));
	
	//Script soll nur auf der Seite "Eintreffend"" aktiviert sein.
	init_UI();
	var mode 	= $(".selected",$(".modemenu"));
	if($("a",mode).eq(0).text().indexOf("Eintreffend")!=-1){
		
		start_running();
	}
	if(getPageAttribute("AR")=="1"){
		renaming();
		
	}
	function renaming(){
		$(".rename-icon").click();
		var duration_cell;
		$("td").each(function(){
			if($(this).text().indexOf("Ankunft in:")!=-1){
				duration_cell=$(this).next();
				duration_cell.css("background-color","green")
			}
		});
		
		//var duration = storageGet("duration");
		var duration 		= $(duration_cell).text();
		var pos_min			= duration.indexOf(":");
		var pos_sec			= duration.indexOf(":",pos_min+1);
		//in sec
		var duration		= parseInt(duration.substring(0,pos_min))*3600+parseInt(duration.substring(pos_min+1,pos_sec))*60+parseInt(duration.substring(pos_sec+1,duration.length));
		
		
		var distance = getDistance2();
		
		var unit_duration = {};
		var unit = "";
		var diff;
		var best_diff = "null";
		
		for (var name in unit_speed){
			unit_duration[name] = unit_speed[name] * 60 * distance;
			diff 	= unit_duration[name]-duration;
			if(diff > 0 && (diff < best_diff || best_diff == "null")){
                unit 		= name;
                best_diff	= diff;
			}
		}
		//Wenn die Rückkehr angezeigt werden soll.
		if(storageGet("show_returntime")=="1"){
			var cell ; 
			$("td").each(function(index){
				if($(this).text().indexOf("Ankunft:")!=-1){
					cell	= $(this).next();
				}
			});
			var ankunft = cell.text();
		
			var ankunft_time = new Date(
				parseInt(20+ankunft.substring(6,8)), 	//y
				parseInt(ankunft.substring(3,5))-1,	//m
				parseInt(ankunft.substring(0,2)),	//d
				parseInt(ankunft.substring(9,11)),	//h 
				parseInt(ankunft.substring(12,14)),	//min
				parseInt(ankunft.substring(15,17)),	//s
				0);
			var rueckkehr_time = ankunft_time;
			rueckkehr_time.setSeconds(rueckkehr_time.getSeconds()+Math.floor(unit_duration[unit]));			
			var attackname 	= unit+" Rückkehr: "+rueckkehr_time.toString().substring(4,rueckkehr_time.toString().indexOf("GMT"));
		}else{
			var attackname	= unit;
		}
		$('[type="text"]').val(attackname);
		$(".btn").click();
		setTimeout(function(){
			window.close();
		}
		,500);
	}
	function start_running(){
		var table 	= $("#incomings_table");
		var rows 	= $("tr",table).slice(1);
		var row;
		var new_Attack = false;
		for(var i = 0; i<rows.length; i++){
			row	= rows[i];			
			var cell = $("td",row).eq(0);			
			var duration_cell = $("td",row).eq(-1);
			//Wenn Ankommender Angriff noch "Angriff" heißt, also noch nicht umbenannt wurde..
			if($("span.quickedit-label",cell).text().indexOf("Angriff")!=-1){
				//$('[type="checkbox"]',cell).click();
				cell.css("background-color","yellow");
				new_Attack=true;
				var link = $("a",cell).attr("href")+"&AR=1";
				window.open(link, '_blank');
			}
			//Einfärben der letzten Zelle, wenn Angriff in weniger als 10 min ankommt
			cell = $("td",row).eq(-1);
			if($("span",cell).text().substring(0,3).indexOf("0:0")!=-1){
				cell.css("background-color","yellow");
				if(parseInt($("span",cell).text().substring(3,4))<5){
					cell.css("background-color","red");
				}
			}
		}
		//letzte aktualisierung 
		
		$("th",table).eq(0).text($("th",table).eq(0).text()+" zuletzt aktualisiert: "+$("#serverTime").text());
		if(storageGet("running")=="1"){
			setTimeout(function(){
				location.href	= "/game.php?screen=overview_villages&mode=incomings&subtype=attacks";
			},percentage_randomInterval(storageGet("refresh_intervall")*60000,5));
		}
	}
	function getDistance2(){
		var koords = {};
		$(".village_anchor").each(function(index){
			koords[index] = $("a",$(this)).eq(0).text();
			var last;
			while(koords[index].indexOf("(")!=-1){
				last=koords[index];
				koords[index]=koords[index].substring(koords[index].indexOf("(")+1,koords[index].length);
			}
			koords[index] = last.substring(last.indexOf("(")+1,last.indexOf(")"));
		});
		return distanceTo(koords["0"],koords["1"]);
	}
	function getDistance(row){
		//Zielkoordinaten
		var target_string = $("a",$("td",row).eq(1)).text();
		target_string=target_string.substring(target_string.indexOf("("),target_string.length);
		//letzte "Klammer Auf" finden
		var last;
		while(target_string.indexOf("(")!=-1){
			last=target_string;
			target_string=target_string.substring(target_string.indexOf("(")+1,target_string.length);
		}
		target_string = last.substring(last.indexOf("(")+1,last.indexOf(")"));
		
		var origin_string = $("a",$("td",row).eq(2)).text();
		origin_string=origin_string.substring(origin_string.indexOf("("),origin_string.length);
		//letzte "Klammer Auf" finden
		var last;
		while(origin_string.indexOf("(")!=-1){
			last=origin_string;
			origin_string=origin_string.substring(origin_string.indexOf("(")+1,origin_string.length);
		}
		origin_string = last.substring(last.indexOf("(")+1,last.indexOf(")"));
		
		var distance = Math.floor(distanceTo(target_string,origin_string)*10);
		return distanceTo(target_string,origin_string); //distance/10
	}
	function distanceTo(koords1,koords2){
		//returns distance in fields
		var pos_trenn1 	= koords1.indexOf("|");
		var pos_trenn2	= koords2.indexOf("|");
		return Math.sqrt(Math.pow(parseInt(koords1.substring(0,pos_trenn1)) - parseInt(koords2.substring(0,pos_trenn2)),2) + Math.pow(parseInt(koords1.substring(pos_trenn1+1,koords1.length)) - parseInt(koords2.substring(pos_trenn2+1,koords2.length)),2));
	}
	
	function init_UI(){
		var eintreffend_menu;
		$("a",$(".modemenu").eq(0)).each(function(){
			var link = $(this).attr("href");
			if(link.indexOf("mode=incomings")!=-1){
				eintreffend_menu = $(this).parent();
			}
		});
		
		$("<span>")
		.attr("id","att_renamer_running")
		.on("click",function(){
			storageSet("running",storageGet("running")=="1" ? "0" : "1");
			toogle_icon(storageGet("running"));
		})
		.appendTo(eintreffend_menu);
				
		toogle_icon(storageGet("running"));
				
		function toogle_icon(setTo){
			var icon = $("#att_renamer_running");
			if(setTo=="1"){
				icon
				.attr("class","icon friend online")
				.attr("title","Att_Renamer aktiviert");
			}else{
				icon
				.attr("class","icon friend offline")
				.attr("title","Att_Renamer deaktiviert");
			}
		}
		
		var button_Einstellungen	= $("<button>")
		.text("Einstellungen")
		.click(function(){
			toggleSettingsVisibility();
		})
		.attr("class","btn")
		.appendTo(eintreffend_menu);
		
		var settingsDivVisible = false;
        var overlay=$("<div>")
        .css({
            "position":"fixed",
            "z-index":"99999",
            "top":"0",
            "left":"0",
            "right":"0",
            "bottom":"0",
            "background-color":"rgba(255,255,255,0.6)",
            "display":"none"
        })
        .appendTo($("body"));
        var settingsDiv=$("<div>")
        .css({
            "position":"fixed",
            "z-index":"100000",
            "left":"50px",
            "top":"50px",
            "width":"400px",
            "height":"200px",
            "background-color":"white",
            "border":"1px solid black",
            "border-radius":"5px",
            "display":"none",
            "padding":"10px"
        })
        .appendTo($("body"));
		function toggleSettingsVisibility() {
            if(settingsDivVisible) {
                overlay.hide();
                settingsDiv.hide();
            } else {
                overlay.show();
                settingsDiv.show();
            }

            settingsDivVisible=!settingsDivVisible;
        }
		
        var settingsTable=$("<table>").appendTo(settingsDiv);
		
		$("<button>").text("Schließen").click(function(){
            toggleSettingsVisibility();
        }).appendTo(settingsDiv);
		function addRow(desc,content) {
            $("<tr>")
            .append($("<td>").append(desc))
            .append($("<td>").append(content))
            .appendTo(settingsTable);
        }
		
		var input_refresh_intervall = $("<input>")
		.attr("type","text")
		.val(storageGet("refresh_intervall"))
		.on("input",function(){
			storageSet("refresh_intervall",parseInt($(this).val()));
			console.log("new refresh Time: "+storageGet("refresh_intervall")+" ms");
		});
		
		var select_show_returntime = $("<select>")
		.append($("<option>").text("Ja").attr("value",1))
        .append($("<option>").text("Nein").attr("value",0))
        .change(function(){
            storageSet("show_returntime", $("option:selected",$(this)).val());
            console.log(storageGet("show_returntime"));
        });
		$("option[value="+storageGet("show_returntime")+"]",select_show_returntime).prop("selected",true);
		
		var select_alarm	= $("<select>")
		.append($("<option>").text("Ja").attr("value",1))
        .append($("<option>").text("Nein").attr("value",0))
        .change(function(){
            storageSet("alarm", $("option:selected",$(this)).val());
            console.log(storageGet("alarm"));
        });
		$("option[value="+storageGet("alarm")+"]",select_alarm).prop("selected",true);
		
		addRow(
		$("<span>").text("Aktualisierung alle x Minuten: "),
		input_refresh_intervall);
		
		addRow(
		$("<span>").text("Rückkehrzeit anzeigen?"),
		select_show_returntime);
		
		addRow(
		$("<span>").text("Warnsystem, wenn Angriff bis zur \nnächsten Aktualisierung ankommt:"),
		select_alarm);
	}
	function randomInterval(min,max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    function percentage_randomInterval(average,deviation){
		average=parseInt(average);
		deviation = deviation > 100 ? 1 : deviation/100; 
		return randomInterval(average*(1+deviation),average*(1-deviation));
	}
	function getPageAttribute(attribute){
        //gibt den Screen zurück, also z.B. von* /game.php?*&screen=report*
        //wenn auf confirm-Seite, dann gibt er "confirm" anstatt "place" zurück
        //return: String
        var params = document.location.search;
        var value = params.substring(params.indexOf(attribute+"=")+attribute.length+1,params.indexOf("&",params.indexOf(attribute+"=")) != -1 ? params.indexOf("&",params.indexOf(attribute+"=")) : params.length);
        return params.indexOf(attribute+"=")!=-1 ? value : "0";
    }
	
 });