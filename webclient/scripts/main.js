$(document).ready(function() {
    submitsettings();

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
                fillColor: "rgba(151,187,205,0.2)",
                strokeColor: "rgba(151,187,205,1)",
                pointColor: "rgba(151,187,205,1)",
                pointStrokeColor: "#fff",
                pointHighlightFill: "#fff",
                pointHighlightStroke: "rgba(151,187,205,1)",
                data: []
            }
        ]
    };

    var chart_ctx = canvas.getContext("2d");
    var temp_history = new Chart(chart_ctx).Line(temp_data, {
        bezierCurve: false,
        pointDot : false,
        pointHitDetectionRadius : 2,
        scaleShowVerticalLines: false,
        scaleOverride: true,
        scaleStartValue: 0,
        scaleStepWidth: 25,
        scaleSteps: 10
    });

    // Status updater
    var time = 0;
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
                    temp_history.addData([data.temperature], time/1000);
                    if(time > 300 * 1000)
                    {
                        temp_history.removeData();
                    }
                }
            },
            complete: function() {
                // Schedule the next request
                time += interval;
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

        var preheat_kp = 0.0;
        var preheat_ki = 0.0;
        var preheat_kd = 0.0;
        var soak_kp = 0.0;
        var soak_ki = 0.0;
        var soak_kd = 0.0;
        var reflow_kp = 0.0;
        var reflow_ki = 0.0;
        var reflow_kd = 0.0;

        var invalid = false;

        if((preheat_setpoint = validate($("#setpoint-preheat").val())) < 0) { invalid = true; }
        if((soak_setpoint = validate($("#setpoint-soak").val())) < 0) { invalid = true; }
        if((reflow_setpoint = validate($("#setpoint-reflow").val())) < 0) { invalid = true; }

        if((preheat_kp = validate($("#pid-preheat-kp").val())) < 0) { invalid = true; }
        if((preheat_ki = validate($("#pid-preheat-ki").val())) < 0) { invalid = true; }
        if((preheat_kd = validate($("#pid-preheat-kd").val())) < 0) { invalid = true; }

        if((soak_kp = validate($("#pid-soak-kp").val())) < 0) { invalid = true; }
        if((soak_ki = validate($("#pid-soak-ki").val())) < 0) { invalid = true; }
        if((soak_kd = validate($("#pid-soak-kd").val())) < 0) { invalid = true; }

        if((reflow_kp = validate($("#pid-reflow-kp").val())) < 0) { invalid = true; }
        if((reflow_ki = validate($("#pid-reflow-ki").val())) < 0) { invalid = true; }
        if((reflow_kd = validate($("#pid-reflow-kd").val())) < 0) { invalid = true; }

        if(invalid)
        {
            alert("The settings you entered are invalid!\nOnly numeric values above 0 are allowed.");
            return;
        }

        $.ajax({
            type: 'POST',
            url: '/pid',
            data: '{\
                "preheat": {\
                    "kp": ' + preheat_kp +',\
                    "ki": ' + preheat_ki +',\
                    "kd": ' + preheat_kd +'\
                },\
                "soak": {\
                    "kp": ' + soak_kp +',\
                    "ki": ' + soak_ki +',\
                    "kd": ' + soak_kd +'\
                },\
                "reflow": {\
                    "kp": ' + reflow_kp +',\
                    "ki": ' + reflow_ki +',\
                    "kd": ' + reflow_kd +'\
                }\
            }',
            contentType: 'application/json; charset=utf-8',
            dataType: 'json'
        });

        $.ajax({
            type: 'POST',
            url: '/setpoints',
            data: '{\
                "preheat": ' + preheat_setpoint + ',\
                "soak": ' + soak_setpoint + ',\
                "reflow": ' + reflow_setpoint + '\
            }',
            contentType: 'application/json; charset=utf-8',
            dataType: 'json'
        });
    }

    $('#apply-settings').click(function() {
        submitsettings();
    });
});
