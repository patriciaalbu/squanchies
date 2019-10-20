const G = 1.5e-3,               // Controls overall simulation speed
    TRAIL_LENGTH = 250,         // # simulation samples
    TRAIL_MAX_ALPHA = 0.5,      // trail opacity upper limit
    TRAIL_THICKNESS = 0.08;     // relative to body's diameter

const width = window.innerWidth, height = window.innerHeight;

let bodyDistortion = 2000,
    lockOn,
    ownBodies,
    zoomLevel = 1,
    au = d3.scaleLinear() // Astronomical unit
        .range([0, Math.min(width, height)]);

var mouse = {
    x: 0,
    y: 0,
    isDown: false
};

var rock = {
    enabled: false,
    start: 0,
    end:0,
    targetIdx: 0,
    x:0,
    y:0,
    xr: 0,
    yr: 0,
    distanceToTarget: 0
};

var distances = [0];
var closestPlanetIdx = 1;


var goldilocks1;
var goldilocks2;
var distancesGoldilocks = [0];

var planetsInside = 0;

var score = 0;

var end = undefined;

var currentLevel = 0;
var previousScore = 0;

// Size canvas
d3.select('#canvas')
    .attr('width', width)
    .attr('height', height)
    .on("mousedown",function(evt) {

        if (rock.enabled) {
            console.log('rock already fired');
        } else {
            mouse.isDown = true;
            console.log('enable rock', evt);
            score = score - 1;

            rock.enabled = true;
            rock.start = new Date().getTime();
            rock.targetIdx = closestPlanetIdx;
            rock.distanceToTarget = distances[closestPlanetIdx];
            rock.end = new Date().getTime() + distances[closestPlanetIdx] / 10000000;
            rock.x = mouse.x;
            rock.y = mouse.y;
        }

    })

    .call(d3.zoom()
        .scaleExtent([1, 1e6])
        .on('zoom', function() {
            zoomed(d3.event.transform.k);
        })
    )

const forceSim = d3.forceSimulation()
    .alphaDecay(0)
    .velocityDecay(0)
    .force('gravity', d3.forceMagnetic()
        .id(d => d.id)
        .charge(node => node.mass)
    )
    .on('tick', ticked);

//

function ticked() {

    if (end) {

        var finalScore = (score + 1000*planetsInside);
        if (finalScore < 0) {
            finalScore = 0;
        }

        $('#level').html('Level: ' + currentLevel);
        $('#prev').html('Previous survivors: ' + previousScore);
        $('#sacrifices').html('Sacrifices: ' + Math.abs(score));
        $('#score1').html('Potential survivors: ' + finalScore);

        var remaining = end - new Date().getTime();

        if (remaining <= 0) {
            if (finalScore == 0) {
                alert('Game over. You have ' + planetsInside + ' planets in Goldilocks with ' +  finalScore + ' potential survirors. There were ' + Math.abs(score) + ' sacrifices.');

                score = 0;
                end = undefined;
                if (previousScore > 0) {
                    alert('Your final score is: ' + previousScore);
                }
                previousScore = 0;
                currentLevel = 0;

                $('.container').show();
                $('.game').hide();
            } else {
                if (currentLevel > 0 && currentLevel < 5) {
                    previousScore += finalScore;
                    currentLevel +=1;
                    alert('Your final score so far is: ' + previousScore + ". Now you will proceed to level " + currentLevel);
                    score = 0;
                    end = undefined;
                    newGane(currentLevel);
                } else if (currentLevel == 5) {
                    previousScore += finalScore;
                    alert('Your final score is: ' + previousScore);
                    score = 0;
                    end = undefined;
                    $('.container').show();
                    $('.game').hide();
                } else {
                    alert('Your final score is: ' + finalScore);
                    score = 0;
                    end = undefined;
                    previousScore = 0;
                    currentLevel = 0;
                    $('.container').show();
                    $('.game').hide();
                }

            }

        } else {
            $('#countdown1').html('Remaining time: ' + (remaining / 1000).toFixed(2) + ' seconds');
        }


    const TAU = 2*Math.PI,
        F = 1e8;   // Scale factor, to prevent bug of (scaled) arcs with r<0.002 from disappearing

    const ctx = d3.select('#canvas')
        .attr('width', width)   // Wipe it
        .attr('height', height)
        .node().getContext('2d');

    const cvs = d3.select('#canvas');
    //console.log('cvs', cvs);
    cvs.on('mousemove', function(){

        var xy = d3.mouse(this);
        //console.log('mm', xy);
        mouse.x = xy[0];
        mouse.y = xy[1];
    });


    // 0,0 at canvas center
    ctx.translate(width/2, height/2);

    // Apply zoom
    if (zoomLevel) {
        ctx.scale(zoomLevel/F, zoomLevel/F);
    }

    // Lock on body
    if (lockOn) {
        ctx.translate(-lockOn.x*F, -lockOn.y*F);
    }

    const nodes = forceSim.nodes();
    for (let i=0; i<nodes.length; i++) {
        const node = nodes[i],
            //r = Math.min(node.name==='sun'?2:Infinity, node.r * bodyDistortion),
			r = node.r * bodyDistortion,
            color = chroma(node.color);


            ctx.fillStyle = color.css();
            ctx.beginPath();
            ctx.arc(node.x*F, node.y*F, r*F, 0, TAU);

            ctx.fill();




        // rays

        if (i > 0) {
            distances[i] = Math.abs(Math.sqrt(
                ((mouse.x - width/2)*F - node.x*F)*((mouse.x - width/2)*F - node.x*F) + ((mouse.y - height/2)*F - node.y*F)*((mouse.y - height/2)*F - node.y*F))
            );
            distancesGoldilocks[i] = Math.abs(Math.sqrt(
                (nodes[0].x*F - node.x*F)*(nodes[0].x*F - node.x*F) + (nodes[0].y*F - node.y*F)*(nodes[0].y*F - node.y*F)));
        }
        // rays



        // Add orbit trails
        var relAlpha = TRAIL_MAX_ALPHA/node.trail.length,
            trailR = r*TRAIL_THICKNESS*F,
            rgb = color.rgb().join(',');

        //if (i == goldilocksIdx1 || i == goldilocksIdx2) {
         //   relAlpha = 1;
        //}

        for (let idx=0, len=node.trail.length; idx<len; idx++) {
            const pnt = node.trail[idx];

            ctx.fillStyle = `rgba(${rgb},${(idx+1)*relAlpha})`;
            ctx.beginPath();
            ctx.arc(pnt[0]*F, pnt[1]*F, trailR, 0, TAU);
            //
            //ctx.fillRect(pnt[0], pnt[1], trailR, trailR); // rects have better performance than arcs
            ctx.fill();

        }

        // Push current coords to trail buffer
        node.trail.push([node.x, node.y]);

        //if (i == goldilocksIdx1 || i == goldilocksIdx2) {
        //    if (node.trail.length > TRAIL_LENGTH * 10) node.trail.shift();
        //} else {
            if (node.trail.length > TRAIL_LENGTH) node.trail.shift();
        //}


    }

    if (!rock.enabled) {
        //ctx.translate(0, 0);
        ctx.fillStyle = '#ff0000';
        ctx.beginPath();
        ctx.arc((mouse.x - width/2)*F, (mouse.y - height/2)*F, 15*F, 0, TAU);
        ctx.fill();
    }

    //goldilocks

    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 60000000;//nodes[closestPlanetIdx].r * bodyDistortion*TRAIL_THICKNESS*F;
    ctx.beginPath();
    ctx.arc(width/2, height/2, goldilocks1*F, 0, TAU);
    ctx.stroke();
    ctx.closePath();



    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 60000000;//nodes[closestPlanetIdx].r * bodyDistortion*TRAIL_THICKNESS*F;
    ctx.beginPath();
    ctx.arc(width/2, height/2, goldilocks2*F, 0, TAU);
    ctx.stroke();
    ctx.closePath();

    var planetsInside1 = 0;
    //console.log('goldilocks between: ', goldilocks1*F, goldilocks2*F);
    //console.log('actualDistances', distancesGoldilocks);
    for (var i=1; i< distancesGoldilocks.length; i++) {
        if (distancesGoldilocks[i] >= goldilocks1*F && distancesGoldilocks[i] <= goldilocks2*F) {
            planetsInside1++;
        }
    }

    planetsInside = planetsInside1;
    $('#score').html("Planets inside Goldilocks: " +planetsInside);

    var minDistance = distances[1];
    closestPlanetIdx = 1;
    for (var i=1; i< distances.length; i++) {
        if (distances[i] < minDistance) {
            minDistance = distances[i];
            closestPlanetIdx = i;
        }
    }

    var ts = new Date().getTime();
    if (rock.enabled && rock.end - ts > 0) {
        //console.log('seconds to impact ', );
        $("#countdown").html(((rock.end - ts) / 1000).toFixed(2) + ' seconds to impact');
    } else if (rock.enabled && rock.end - ts <= 0) {
        var hitx = 0, hity = 0;
        if (nodes[rock.targetIdx].x*F > rock.xr) {
            hitx = forceSim.nodes()[rock.targetIdx]['r']*2000;
        } else {
            hitx = -forceSim.nodes()[rock.targetIdx]['r']*2000;
        }
        if (nodes[rock.targetIdx].y*F > rock.yr) {
            hity = forceSim.nodes()[rock.targetIdx]['r']*2000;
        } else {
            hity = -forceSim.nodes()[rock.targetIdx]['r']*2000;
        }
        $("#countdown").html('');
        rock.enabled = false;
        forceSim.nodes()[rock.targetIdx].x += hitx;
        forceSim.nodes()[rock.targetIdx].y += hity;
    }

    if (!rock.enabled) {
        //console.log(mouse.isDown);
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 60000000;//nodes[closestPlanetIdx].r * bodyDistortion*TRAIL_THICKNESS*F;
        //console.log(ctx.lineWidth);
        ctx.beginPath();
        ctx.moveTo(nodes[closestPlanetIdx].x*F, nodes[closestPlanetIdx].y*F);
        ctx.lineTo((mouse.x - width/2)*F, (mouse.y - height/2)*F);
        //console.log(node.x*F, (mouse.x - width/2)*F, node.y*F, (mouse.y - height/2)*F);
        //ctx.lineTo((node.x+1000)*F, (node.y+1000)*F);
        ctx.stroke();
        ctx.closePath();
    } else {
        // rock on its way
        ctx.strokeStyle = '#fff710';
        ctx.lineWidth = 60000000;
        ctx.beginPath();
        ctx.moveTo(nodes[rock.targetIdx].x*F, nodes[rock.targetIdx].y*F);
        ctx.lineTo((rock.x - width/2)*F, (rock.y - height/2)*F);
        //console.log(node.x*F, (mouse.x - width/2)*F, node.y*F, (mouse.y - height/2)*F);
        //ctx.lineTo((node.x+1000)*F, (node.y+1000)*F);
        ctx.stroke();
        ctx.closePath();

        var percent = (rock.end - ts)/(rock.end - rock.start);

        var xd = nodes[rock.targetIdx].x*F - (rock.x - width/2)*F;
        var yd = nodes[rock.targetIdx].y*F - (rock.y - height/2)*F;

        rock.xr = (1-percent)*nodes[rock.targetIdx].x*F + percent*(rock.x - width/2)*F;
        rock.yr = (1-percent)*nodes[rock.targetIdx].y*F + percent*(rock.y - height/2)*F;

        ctx.fillStyle = '#e9eeff';
        ctx.beginPath();
        ctx.arc(rock.xr, rock.yr, forceSim.nodes()[rock.targetIdx]['r']*2000*F, 0, TAU);
        ctx.fill();

    }
    }

}

function zoomed(newZoomLevel=zoomLevel) {
    newZoomLevel=1;
    console.log(newZoomLevel);
    const changeRatio = zoomLevel/newZoomLevel,
        sqrtChangeRatio = Math.sqrt(changeRatio);

    zoomLevel = newZoomLevel;
    d3.select('#au-100px-scale').text(Math.round(au.invert(100) / zoomLevel * 1000) / 1000);

    // Slow down motion on zoom-in
    forceSim.stop();
    forceSim.force('gravity').strength(forceSim.force('gravity').strength()()*changeRatio);
    forceSim.nodes().forEach(d => {
        d.vx *= sqrtChangeRatio;
        d.vy *= sqrtChangeRatio;
    });
    forceSim.restart();
}

function load(bodies, gl1, gl2) { //jsonFile instead of bodies

    goldilocks1 = gl1;
    goldilocks2 = gl2;

    if (currentLevel == 0 || currentLevel == 1) {
        previousScore = 0;
    }

    ownBodies = bodies;
    //d3.json(jsonFile, (error, bodies) => {
        const maxDistance = d3.max(bodies.map(d => d3.max(d.satellites.map(s => d.distance + s.distance))));
        au.domain([0, maxDistance * 2.1]);
        zoomed(); // Display scale

        const pxG = G * Math.pow(au(1), 3); // in cube of AUs

        forceSim.nodes(parseBodies(bodies))
            .force('gravity').strength(pxG);

        // Add lock radio buttons
        const bodyLock = d3.select('#bodylock').selectAll('div')
            .data(forceSim.nodes()).enter().append('div');

        lockOn = forceSim.nodes()[0]; // Lock on first body

        bodyLock.append('input')
            .attr('type', 'radio')
            .attr('name', 'bodylock')
            .attr('id', d => `bodylock-${d.name}`)
            .attr('value', d => d.name)
            .attr('checked', d => d.name === 'sun' ? true : null)
            .on("change", function() {
                forceSim.nodes().some(d => {
                   if (d.name === this.value) {
                       lockOn = d;
                       return true;
                   }
                });
            });

        bodyLock.append('label')
            .attr('for', d => `bodylock-${d.name}`)
            .style('color', d => d.color)
            .text(d => `${d.symbol?`${d.symbol} `:''}${d.name}`);

        //

        function parseBodies(bodies, parentMass = 0, posOffset = [0,0], velocityOffset = [0,0]) {
            return [].concat(...bodies.map(body => {
                const ang = (body.phase || (Math.random() * 360)) * Math.PI/180, // Random init angle if not specified (to prevent aligned init forces from distorting orbits)
                    x = posOffset[0] + au(body.distance) * Math.sin(ang),
                    y = posOffset[1] - au(body.distance) * Math.cos(ang),
                    relVelocity = (body.distance ? Math.sqrt(pxG * parentMass / au(body.distance)): 0) * (body.factorV || 1), // orbital velocity: sqrt(GM/d)
                    vx = velocityOffset[0] + relVelocity * Math.cos(ang),
                    vy = velocityOffset[1] + relVelocity * Math.sin(ang);

                return [{
                        name: body.name,
                        symbol: body.symbol || null,
                        color: body.color || 'darkgrey',
                        r: au(body.r || Math.cbrt(body.mass)),
                        mass: body.mass,                        // mass in solar masses
                        x: x,                                   // radius, distance & velocity in AUs
                        y: y,
                        vx: vx,
                        vy: vy,
                        trail: []                               // Store previous positions
                    },
                    ...parseBodies(body.satellites || [], body.mass, [x,y], [vx,vy])
                ]
            }));
        }

        end = new Date().getTime() + 60000;
}

// Event handlers
function onBodyDistortionChange(dist) {

	//console.log(forceSim.nodes()[1]);
    bodyDistortion = dist;
    d3.select('#bodydistortion-val').text(dist);
    //zoomed(500);
}

