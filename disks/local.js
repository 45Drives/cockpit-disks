/*  45Drives/cockpit-disks - Cockpit plugin for displaying disk info
 *  Copyright (C) 2020 Josh Boudreau <jboudreau@45drives.com>
 * 
 *  This file is part of 45Drives/cockpit-disks.
 *
 *  Cockpit-disks is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  Cockpit-disks is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with Cockpit-disks.  If not, see <https://www.gnu.org/licenses/>.
 */

const err_msg = document.getElementById("error-output");
const err_box = document.getElementById("alert-box");

var disk_info;

function grab_info() {
    var dfd = cockpit.defer();
    document.getElementById("loading").style.display = "block";
    err_box.style.display = "none";
    document.getElementById("warning-box").style.display = "none";
    var proc = cockpit.spawn(["/usr/bin/pkexec","/usr/bin/lsdev","--json"], {err: "out"});
    proc.always(function() {
        document.getElementById("loading").style.display = "none";
    });
    proc.done(function(data) {
        disk_info = JSON.parse(data);
        dfd.resolve();
        document.getElementById("controller").innerHTML = disk_info["meta"]["disk-controller"];
        document.getElementById("driver-vers").innerHTML = disk_info["meta"]["driver-version"];
    });
    proc.fail(function(ex, data) {
        if(ex.exit_status != 127 && ex.exit_status & (1<<1)) { // bit test, see man smartctl for exit code description
            // permission denied for smartctl, some data still available
            document.getElementById("warning-output").innerHTML = 
                "Error running smartctl within lsdev. Some information is still available, but run as privileged user for full disk information.";
            document.getElementById("warning-box").style.display = "block"
            disk_info = JSON.parse(data);
            document.getElementById("controller").innerHTML = disk_info["meta"]["disk-controller"];
            document.getElementById("driver-vers").innerHTML = disk_info["meta"]["driver-version"];
            dfd.resolve();
        }else{
            err_box.style.display = "block";
            err_msg.innerHTML = "Error running lsdev, are 45Drives tools installed?<br>";
            err_msg.innerHTML += `<pre>${ex.message}\n${data}</pre>`
            dfd.reject(ex);
        }
    });
    var current_bay = document.getElementById("bay-id").innerHTML;
    if(current_bay != "?") {
        let regex = current_bay.match(/(\d)-(\d+)/);
        let row = regex[1] - 1;
        let bay = regex[2] - 1;
        set_up_disk_buttons();
        set_disk_info(row, bay);
    }
    return dfd.promise();
}

function set_rows_visible() {
    for(row of document.getElementsByClassName("storinator-row")) {
        row.style.display = "none";
    }
    switch(disk_info.rows.length) {
    case 4:
        document.getElementById("storinator-row-4").style.display = "table-cell";
    case 3:
        document.getElementById("storinator-row-3").style.display = "table-cell";
    case 2:
        document.getElementById("storinator-row-2").style.display = "table-cell";
    case 1:
        document.getElementById("storinator-row-1").style.display = "table-cell";
        break;
    default:
        err_msg.innerHTML = "Error showing rows";
        break;
    }
}

function set_disk_info(row, bay) {
    var values = document.getElementsByClassName("value");
    for(value of values) {
        var val = disk_info.rows[row][bay][value.id];
        if(val.length == 0) {
            value.innerHTML = "?";
        }else{
            value.innerHTML = val;
        }
    }
    var health = document.getElementById("health");
    if(health.innerHTML == "OK") {
        health.style.color = "#19911d";
    }else if(health.innerHTML == "POOR") {
        health.style.color = "#e39500";
    }else{
        health.style.color = "";
    }
    changeTempUnit();
}

function set_up_disk_buttons() {
    var disks = document.getElementsByClassName("disk");
    for(disk of disks) {
        let regex = disk.id.match(/disk-(\d)-(\d+)/);
        let row = regex[1] - 1;
        let bay = regex[2] - 1;
        if(row >= disk_info.rows.length || bay >= disk_info.rows[row].length)
            continue;
        disk.onclick = function() {
            set_disk_info(row, bay);
            /*var values = document.getElementsByClassName("value");
            for(value of values){
                value.innerHTML = disk_info.rows[row][bay][value.id];
            }*/
        }
        if(disk.childNodes.length > 1){
            disk.removeChild(disk.childNodes[1]);
        }
        if(disk_info.rows[row][bay]["occupied"]) {
            disk.style.color = "black";
            var img = document.createElement("img");
            if(disk_info.rows[row][bay]["partitions"] == 0) {
                if(disk_info.rows[row][bay]["health"] == "OK") {
                    img.src = "img/disk-unpartitioned-ok.png";
                }else if(disk_info.rows[row][bay]["health"] == "POOR") {
                    img.src = "img/disk-unpartitioned-poor.png";
                }else{
                    img.src = "img/disk-unpartitioned.png";
                }
            }else{
                if(disk_info.rows[row][bay]["health"] == "OK") {
                    img.src = "img/disk-partitioned-ok.png";
                }else if(disk_info.rows[row][bay]["health"] == "POOR") {
                    img.src = "img/disk-partitioned-poor.png";
                }else{
                    img.src = "img/disk-partitioned.png";
                }
            }
            disk.appendChild(img);
        }else{
            disk.style.backgroundColor = "transparent";
            disk.style.boxShadow = '10px 0 10px 3px #000000 inset';
            disk.style.color = "grey";
        }
    }
    heatmap();
}

function spin_fans() {
    var fans = document.getElementsByClassName("rotatable");
    for(var i = 0; i < fans.length; i++){
      let fan = fans[i];
      fan.rotate_logo = false;
      fan.rotation = 0;

      fan.onclick = function(){
        if(fan.rotate_logo)
          fan.rotate_logo = false;
        else
          fan.rotate_logo = true;
      }
      
      setInterval(function(){
        if(!fan.rotate_logo)
          return;
        fan.rotation = (fan.rotation + 5) % 360;
        fan.style.transform = `rotate(${ fan.rotation }deg)`;
      },50);
    }
}

function export_JSON() {
    let data = JSON.stringify(disk_info, null, 4);
    let dataURI = 'data:application/json;charset=utf-8,'+ encodeURIComponent(data);
    window.open(dataURI);
}

function mapTempToColour(tempStr, min, max) {
    let tempNum = parseInt(tempStr.match(/\d{1,3}/));
    if(tempNum > max)
        tempNum = max;
    else if(tempNum < min)
        tempNum = min;
    tempNum -= min;
    max -= min; // 0 to (max - min)
    let slope = (255 / ((max)/3));
    let R = Math.round(slope * (tempNum - max/3));
    if(R > 255)
        R = 255;
    else if(R < 0)
        R = 0;
    let G = Math.round(-1 * slope * (tempNum - max));
    if(G > 255)
        G = 255;
    else if(R < 0)
        G = 0;
    let B = Math.round(-1 * slope * (tempNum - max/3));
    if(B > 255)
        B = 255;
    else if(B < 0)
        B = 0;
    let colourStr = `#${("0" + R.toString(16)).slice(-2)}${("0" + G.toString(16)).slice(-2)}${("0" + B.toString(16)).slice(-2)}`;
    return colourStr;
}

function heatmap() {
    let min = document.getElementById("min-temp").valueAsNumber;
    let max = document.getElementById("max-temp").valueAsNumber;
    let min_orig = min;
    let max_orig = max;
    if(document.getElementById("fahrenheit").checked) {
        min = Math.round((min - 32) * 5 / 9);
        max = Math.round((max - 32) * 5 / 9);
    }
    if(min < max) {
        err_box.style.display = "none";
    }else{
        err_msg.innerHTML = "Minimum temperature must be less than maximum temperature!";
        err_box.style.display = "block";
        return;
    }
    var disks = document.getElementsByClassName("disk");
    for(disk of disks) {
        let regex = disk.id.match(/disk-(\d)-(\d+)/);
        let row = regex[1] - 1;
        let bay = regex[2] - 1;
        if(row >= disk_info.rows.length || bay >= disk_info.rows[row].length)
            continue;
        if(disk_info.rows[row][bay]["occupied"]) {
            if(document.getElementById("toggle-heatmap").checked == false) {
                disk.style.backgroundColor = "lightgray";
                disk.style.boxShadow = "0 0 4px 0 #000000";
            }else{
                disk.style.backgroundColor = mapTempToColour(disk_info.rows[row][bay]["temp-c"], min, max);
                disk.style.boxShadow = "0 0 4px 0 #000000";
            }
        }
    }
    const tempBox = document.getElementById("temp-box");
    const tempScale = document.getElementById("temp-scale");
    const tempLimits = document.getElementById("temp-limits");
    if(document.getElementById("toggle-heatmap").checked == true){
        while(tempScale.lastElementChild)
            tempScale.removeChild(tempScale.lastElementChild);
        tempScale.style.display = "flex";
        tempBox.style.display = "flex";
        for(var i = 50; i >= 0; i--){
            var slice = document.createElement("div");
            slice.className += "temp-gradient-slice";
            slice.style.backgroundColor = mapTempToColour(i.toString(), 0, 50);
            tempScale.appendChild(slice);
        }
        tempLimits.style.display = "flex";
        tempLimits.firstElementChild.innerHTML = max_orig.toString() + (document.getElementById("celsius").checked ? "&#8451;" : "&#8457;");
        tempLimits.lastElementChild.innerHTML = min_orig.toString() + (document.getElementById("celsius").checked ? "&#8451;" : "&#8457;");
    }else{
        tempBox.style.display = "none";
    }
}

function changeTempUnit() {
    var temps = document.getElementsByClassName("temperature");
    for(temp of temps) {
        if(document.getElementById("celsius").checked && temp.innerHTML.slice(-1) === '\u2109') {
            if(temp.old_temp_c)
                temp.innerHTML = temp.old_temp_c;
        }else if(document.getElementById("fahrenheit").checked && temp.innerHTML.slice(-1) === '\u2103') {
            temp.old_temp_c = temp.innerHTML;
            temp.innerHTML = (parseInt(temp.innerHTML.match(/\d{1,3}/)) * 9 / 5 + 32).toString() + "&#8457;";
        }
    }
    heatmap();
}

function refresh() {
    var promise = grab_info();
    promise.done(function() {
        set_rows_visible();
        set_disk_info(0,0);
        set_up_disk_buttons();
    });
}

function main() {
    document.getElementById("refresh-button").addEventListener("click", refresh);
    document.getElementById("export-json-button").addEventListener("click", export_JSON);
    document.getElementById("toggle-heatmap").addEventListener("change", heatmap);
    document.getElementById("min-temp").addEventListener("change", heatmap);
    document.getElementById("max-temp").addEventListener("change", heatmap);
    document.getElementById("celsius").addEventListener("change", changeTempUnit);
    document.getElementById("fahrenheit").addEventListener("change", changeTempUnit);
    spin_fans();
    refresh();
}

main();

// Send a 'init' message.  This tells integration tests that we are ready to go
cockpit.transport.wait(function() { });
