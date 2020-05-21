const output = document.getElementById("output");
const result = document.getElementById("result");

function sensors_run() {
    cockpit.spawn(["sensors"])
        .stream(sensors_output)
        .then(sensors_success)
        .catch(sensors_fail);
}

var interval = setInterval(sensors_run, 5000);

function sensors_success() {
    result.style.color = "green";
}

function sensors_fail() {
    result.style.color = "red";
    output.innerHTML = "Launching sensors failed. Is it installed?";
}

function sensors_output(data) {
    output.innerHTML = "";
    output.append(document.createTextNode(data));
}

// Send a 'init' message.  This tells integration tests that we are ready to go
cockpit.transport.wait(function() { });
