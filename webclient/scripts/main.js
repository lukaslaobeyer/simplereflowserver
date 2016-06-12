$(document).ready(function() {
    // Temp. history chart
    var canvas = document.getElementById("temp-history");
    // Make it visually fill the positioned parent
    canvas.style.width ='100%';
    canvas.style.height='100%';
    canvas.width  = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    var temp_data = {
        labels: [],
        datasets: [
            {
                label: "Temperature",
                fill: false,
                borderColor: "rgba(200,56,56,1)",
                pointRadius: 0,
                lineTension: 0,
                data: []
            },
            {
                label: "Preset",
                fill: true,
                borderColor: "rgba(15,150,200,1)",
                lineTension: 0,
                data: []
            }
        ]
    };

    var chart_ctx = canvas.getContext("2d");
    var temp_history = new Chart(chart_ctx, {
        type: 'line',
        data: temp_data,
        options: {
            scales: {
                xAxes: [{
                    type: 'linear',
                    position: 'bottom',
                    ticks: {
                        stepSize: 15,
                        min: 0,
                        max: 300
                    }
                }],
                yAxes: [{
                    ticks: {
                        stepSize: 25,
                        min: 0,
                        max: 260
                    }
                }]
            }
        }
    });

    // Status updater
    var time = 0;
    var time_since_start = 0;
    var interval = 500;

    (function worker() {
        $.ajax({
            url: '/status',
            success: function(data) {
                if(data.connected) {
                    $('#content').show();
                    $('#error-msg').hide();
                } else {
                    $('#content').hide();
                    $('#error-msg').show();
                }

                $('#temperature').html(Math.round(data.temperature) + '&deg;C');
                $('#phase .value').html(data.phase);
                if(data.setpoint <= 0) {
                    $('#setpoint .value').html('unknown');
                } else {
                    $('#setpoint .value').html(data.setpoint + '&deg;C');
                }

                if(data.phase != 'Ready')
                {
                    $('#start-reflow').addClass('disabled');
                    $('#stop-reflow').removeClass('disabled');
                }
                else
                {
                    $('#start-reflow').removeClass('disabled');
                    $('#stop-reflow').addClass('disabled');
                }

                if(time % 2500 == 0)
                {
                    if(data.phase != 'Ready' || data.phase == 'Cooldown')
                    {
                        temp_history.data.datasets[0].data.push({x: time_since_start / 1000, y: data.temperature});
                        temp_history.update();
                    }
                    else
                    {
                        time_since_start = 0;
                    }
                }
            },
            complete: function() {
                // Schedule the next request
                time += interval;
                time_since_start += interval;
                setTimeout(worker, interval);
            }
        });
    })();

    // Oven control
    $('#start-reflow').click(function() {
        $.ajax({
            type: 'POST',
            url: '/status',
            data: '{"oven_on": true}',
            contentType: 'application/json; charset=utf-8',
            dataType: 'json'
        });

        temp_history.data.datasets[0].data = [];
        temp_history.update();
    });

    $('#stop-reflow').click(function() {
        $.ajax({
            type: 'POST',
            url: '/status',
            data: '{"oven_on": false}',
            contentType: 'application/json; charset=utf-8',
            dataType: 'json'
        });
    });

    // Settings
    function validate(number) {
        var parsed = parseFloat(number);

        if(!isNaN(parsed)) {
            if(parsed >= 0) {
                return parsed;
            }
        }

        return -1;
    }

    function submitsettings() {
        var preheat_setpoint = 0.0;
        var soak_setpoint = 0.0;
        var reflow_setpoint = 0.0;
        var preheat_duration = 0.0;
        var soak_duration = 0.0;
        var reflow_duration = 0.0;

        var invalid = false;

        if((preheat_setpoint = validate($("#setpoint-preheat").val())) < 0) { invalid = true; }
        if((soak_setpoint = validate($("#setpoint-soak").val())) < 0) { invalid = true; }
        if((reflow_setpoint = validate($("#setpoint-reflow").val())) < 0) { invalid = true; }

        if((preheat_duration = validate($("#duration-preheat").val())) < 0) { invalid = true; }
        if((soak_duration = validate($("#duration-soak").val())) < 0) { invalid = true; }
        if((reflow_duration = validate($("#duration-reflow").val())) < 0) { invalid = true; }

        if(invalid)
        {
            alert("The settings you entered are invalid!\nOnly numeric values above 0 are allowed.");
            return;
        }

        temp_history.data.datasets[1].data = [
            {x: 0, y: 25},
            {x: preheat_duration, y: preheat_setpoint},
            {x: preheat_duration + soak_duration, y: soak_setpoint},
            {x: preheat_duration + soak_duration + reflow_duration, y: reflow_setpoint},
            {x: 300, y: 100}
        ];

        temp_history.update();

        var setpoints = {
            preheat: {
                setpoint: preheat_setpoint,
                duration: preheat_duration
            },
            soak: {
                setpoint: soak_setpoint,
                duration: soak_duration
            },
            reflow: {
                setpoint: reflow_setpoint,
                duration: reflow_duration
            }
        };

        $.ajax({
            type: 'POST',
            url: '/setpoints',
            data: JSON.stringify(setpoints),
            contentType: 'application/json; charset=utf-8',
            dataType: 'json'
        });
    }

    $('#apply-settings').click(function() {
        submitsettings();
    });

    submitsettings();
});
