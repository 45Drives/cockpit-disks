const err_msg = document.getElementById("error-output");

var disk_info;

function grab_info() {
    var dfd = cockpit.defer();
    var proc = cockpit.spawn(["/usr/local/bin/lsdev","--json"]);
    proc.done(function(data) {
        disk_info = JSON.parse(data);
        dfd.resolve();
    });
    proc.fail(function(ex) {
        err_msg.innerHTML = "Error running lsdev";
        dfd.reject(ex);
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
    if(min < max) {
        document.getElementById("temp-error").innerHTML = "";
    }else{
        document.getElementById("temp-error").innerHTML = "Min temp must be less than max temp!";
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
            if(document.getElementById("toggle-heatmap").checked == false)
                disk.style.backgroundColor = "lightgray";
            else
                disk.style.backgroundColor = mapTempToColour(disk_info.rows[row][bay]["temp-c"], min, max);
        }
    }
    const tempScale = document.getElementById("temp-scale");
    const tempLimits = document.getElementById("temp-limits");
    if(document.getElementById("toggle-heatmap").checked == true){
        while(tempScale.lastElementChild)
            tempScale.removeChild(tempScale.lastElementChild);
        tempScale.style.display = "flex";
        for(var i = 50; i >= 0; i--){
            var slice = document.createElement("div");
            slice.className += "temp-gradient-slice";
            slice.style.backgroundColor = mapTempToColour(i.toString(), 0, 50);
            tempScale.appendChild(slice);
        }
        tempLimits.style.display = "flex";
        tempLimits.firstElementChild.innerHTML = max.toString() + "&#8451;";
        tempLimits.lastElementChild.innerHTML = min.toString() + "&#8451;";
    }else{
        tempScale.style.display = "none";
        tempLimits.style.display = "none";
    }
}

function main() {
    document.getElementById("refresh-button").addEventListener("click", grab_info);
    document.getElementById("export-json-button").addEventListener("click", export_JSON);
    document.getElementById("toggle-heatmap").addEventListener("change", heatmap);
    document.getElementById("min-temp").addEventListener("change", heatmap);
    document.getElementById("max-temp").addEventListener("change", heatmap);
    spin_fans();
    var promise = grab_info();
    promise.done(function() {
        set_rows_visible();
        set_disk_info(0,0);
        set_up_disk_buttons();
    });
}

main();

// Send a 'init' message.  This tells integration tests that we are ready to go
cockpit.transport.wait(function() { });
