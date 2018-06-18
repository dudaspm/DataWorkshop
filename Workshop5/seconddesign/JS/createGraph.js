function createGraph() {
	// maximize design for the entire screen
	w = window.innerWidth-20, h = window.innerHeight-100;
	var margin = {top: 0, right: 0, bottom: -50, left: 0}
	// append SVG to the DIV (see: index.html)	
	svg = d3.select("div#graph").append("svg")
		.attr("class","main")
		.attr("width", w - margin.left - margin.right)
		.attr("height", h - margin.bottom - margin.top);
		
	// used to create a time object (see https://github.com/d3/d3-time-format#locale_format )
	var parseTime = d3.timeParse("%V/%Y");
	
	// now scale the x-axis based on time (see: https://github.com/d3/d3-scale#scaleTime )
	// Adjust the margins a bit to help make the text a bit more readable
	// We now need two x-axis (taken) and (infected)
	adjustLeft = 50
	adjustRight = 10
	adjustTop = 20
	var x1 = d3.scaleTime().rangeRound([adjustLeft, w-adjustRight]);
	var x2 = d3.scaleTime().rangeRound([adjustLeft, w-adjustRight]);
	
	// now scale the y-axis based on the numerical values (using a linear scaling) (see: https://github.com/d3/d3-scale#scaleLinear )
	// We now need two y-axis (anitbody value) and (anitbody count = histogram)
	var y1 = d3.scaleLinear().rangeRound([h/2, adjustTop]); 
	var y2 = d3.scaleLinear().rangeRound([h, (h/2)+adjustTop]); 
	
	// read in the CSV (see: https://github.com/d3/d3-dsv )
	// we need to return both an x position and y position
	// in this case, x = both when the antibody was taken (time) and when they were infected (time)
	// y = is just the antibody count (linear)
	// CORRECTION! months need to be changed to weeks
	d3.csv("../data/back-mapping-file.csv", function(d) { return d;}, function(error, data) {
		if (error) throw error;
		// dataset for the top graph (antibody value vs. taken date)
		dataPoints = []
		// dataset for bottom plot (antibody count based on infected date)
		infectCount = {}
	data.forEach(function(d) {
		a = +d.antibody;
		year1 = d.taken_year;
		week1 = d.taken_month;
		date1 = parseTime(week1+"/"+year1);
		year2 = d.infected_year;
		week2 = d.infected_month;
		(year2!="0") ? date2 = parseTime(week2+"/"+year2) : date2 = -1;
		if (year2!="0") {
			if (typeof infectCount[parseTime(week2+"/"+year2)] === "undefined") infectCount[parseTime(week2+"/"+year2)] = 1;
			infectCount[parseTime(week2+"/"+year2)]++;
		}		
		dataPoints.push({"antibody":a,"taken":date1,"infected":date2,"infectCounter":infectCount[date2]})
	})
	console.log(dataPoints);
	console.log(infectCount);
	
	// object into array
	infectHistogram = []
	for (i in infectCount) {
		infectHistogram.push({"date":i,"count":infectCount[i]})
	}
	
	// in this case, we are only mapping the "taken date" vs "the antibody count"
	// d3.extent will find BOTH the lower and upper bounds of an array (min and max)
	// x1 = min and max of taken date
	x1.domain(d3.extent(dataPoints, function(d) {  return d.taken; }));
	// x2 = min and max of infected date (minus the values = N/A or 0)
	x2.domain(d3.extent(dataPoints.filter(function(e) {return e.infected != -1}), function(d) {  return d.infected; }));
	
	// y1 = min and max of antibody value
	y1.domain(d3.extent(dataPoints, function(d) { return d.antibody; }));
	// y2 = min and max of antibody count
	y2.domain(d3.extent(infectHistogram, function(d) { return d.count; }));
	
	// create the x-axis 1
	svg.append("g")
		.attr("transform", "translate(0," + (h/2)*1 + ")")
		.call(d3.axisBottom(x1))
		.select(".domain")
		.remove();
	// create the x-axis 2	
	svg.append("g")
		.attr("transform", "translate(0," + (h/2)*2 + ")")
		.call(d3.axisBottom(x2))
		.select(".domain")
		.remove();
	
	// create the y-axis 1
	svg.append("g")
		.attr("transform", "translate("+adjustLeft+"," + (h/2)*0 + ")")
		.call(d3.axisLeft(y1).ticks(10))
	svg.append("text")
		.attr("fill", "#000")
		.attr("transform", "rotate(-90)")
		.attr("y", adjustLeft+6)
		.attr("x", -30)
		.attr("dy", "0.71em")
		.attr("text-anchor", "end")
		.text("Anitbody");
	// create the y-axis 2
	svg.append("g")
		.attr("transform", "translate("+adjustLeft+"," + (h/2)*0 + ")")
		.call(d3.axisLeft(y2).ticks(10))
	svg.append("text")
		.attr("fill", "#000")
		.attr("transform", "rotate(-90)")
		.attr("y", adjustLeft+6)
		.attr("x", -(30+(h/2)))
		.attr("dy", "0.71em")
		.attr("text-anchor", "end")
		.text("Infected Date (Histogram)");		
		
	// create the points for 0 or N\A values
	svg.selectAll("circle.datapoints1")
		.data(dataPoints.filter(function(d) { return (d.infected==-1)})).enter().append("circle")
		.attr("class", "datapoints1")
		.attr("fill", "none")
		.style("stroke", "steelblue")
		.style("stroke-width", 2)
		.style("stroke-opacity", 1)
		.attr("cx", function(d) { return x1(d.taken)})
		.attr("cy", function(d) { return y1(d.antibody)})
		.attr("r", "2px");	
	// create the points for all others
	svg.selectAll("circle.datapoints2")
		.data(dataPoints.filter(function(d) { return (d.infected!=-1)})).enter().append("circle")
		.attr("class", "datapoints2")
		.attr("fill", "none")
		.style("stroke", "steelblue")
		.style("stroke-width", 2)
		.style("stroke-opacity", 1)
		.attr("cx", function(d) { return x1(d.taken)})
		.attr("cy", function(d) { return y1(d.antibody)})
		.attr("r", "2px");	
	})
	
	// Chained transitions
	svg
		.on("click", function() { 
			counter = 0;
	
			t0 = svg.transition()
				t0.selectAll("circle.datapoints1").transition().duration(1000).delay(function(d, i) { console.log(i); return i*2; })
				.attr("cx", function(d) { return 0})
				.attr("cy", function(d) { return h/2})
			t1 = t0.transition().duration(6000)
			t1.selectAll("circle.datapoints2")
				.transition()
				.duration(1000)
				.delay(function(d, i) { counter = counter + (1000/((i+1)*.5)); return counter; })
				.attr("cx", function(d) { return (d.infected==-1) ?  0 : x2(d.infected)})
				.attr("cy", function(d) { return (d.infected==-1) ?  h/2 : y2(d.infectCounter)})
			 
		})
}