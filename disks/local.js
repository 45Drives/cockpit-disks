const refresh_button = document.getElementById("refresh-button");
const err_msg = document.getElementById("error-output");

var disk_info;

function grab_info() {
    console.log("Pressed");
    var dfd = cockpit.defer();
    var proc = cockpit.spawn(["/usr/local/bin/lsdev","--json"]);
    proc.done(function(data) {
        disk_info = JSON.parse(data);
        console.log(disk_info);
        dfd.resolve();
    });
    proc.fail(function(ex) {
        err_msg.innerHTML = "Error running lsdev";
        dfd.reject(ex);
    });
    var current_bay = document.getElementById("bay-id").innerHTML;
    if(current_bay != "?"){
        let regex = current_bay.match(/(\d)-(\d+)/);
        let row = regex[1] - 1;
        let bay = regex[2] - 1;
        set_disk_info(row, bay);
    }
    return dfd.promise();
}

function set_rows_visible() {
    for(row of document.getElementsByClassName("storinator-row")){
        row.style.display = "none";
    }
    switch(disk_info.rows.length){
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
    for(value of values){
        console.log(value.id);
        value.innerHTML = disk_info.rows[row][bay][value.id];
    }
    console.log(values);
}

function set_up_buttons() {
    var disks = document.getElementsByClassName("disk");
    for(disk of disks){
        let regex = disk.id.match(/disk-(\d)-(\d+)/);
        let row = regex[1] - 1;
        let bay = regex[2] - 1;
        disk.onclick = function() {
            var values = document.getElementsByClassName("value");
            for(value of values){
                value.innerHTML = disk_info.rows[row][bay][value.id];
            }
        }
    }
}

function main() {
    refresh_button.addEventListener("click", grab_info);
    var promise = grab_info();
    promise.done(function(){
        set_rows_visible();
        set_disk_info(0,0);
        set_up_buttons();
    });
}

main();

// Send a 'init' message.  This tells integration tests that we are ready to go
cockpit.transport.wait(function() { });
