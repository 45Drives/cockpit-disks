const refresh_button = document.getElementById("refresh-button");
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
        value.innerHTML = disk_info.rows[row][bay][value.id];
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
            var values = document.getElementsByClassName("value");
            for(value of values){
                value.innerHTML = disk_info.rows[row][bay][value.id];
            }
        }
        if(disk_info.rows[row][bay]["occupied"])  {
            if(disk_info.rows[row][bay]["partitions"] == 0) {
                disk.style.backgroundColor = "limegreen";
                disk.style.color = "black";
                var img = document.createElement("img");
                img.src = "img/disk-unpartitioned.png";
                disk.appendChild(img);
            }else{
                disk.style.backgroundColor = "lime";
                disk.style.color = "black";
                var img = document.createElement("img");
                img.src = "img/disk-partitioned.png";
                disk.appendChild(img);
            }
        }else{
            disk.style.backgroundColor = "transparent";
            disk.style.color = "grey";
        }
    }
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

function main() {
    refresh_button.addEventListener("click", grab_info);
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
