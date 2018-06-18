// color by unique value (ordinal) using 10 colors (see: https://github.com/d3/d3-scale/issues/63 )
var color = d3.scaleOrdinal(d3.schemeCategory10);
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
		// used to collect per week clusters
		weekCluster = [];
		// filter the data for only 2015
		data = data.filter(function(d) { return d.taken_year == "2015"})
		///////////////////////////////////////////
		/// Start brute force clustering algorithm
		data.forEach(function(d) { if (!(weekCluster.indexOf(+d.taken_month)+1)) weekCluster.push(+d.taken_month); })
		group = 0;
		cluster = {};
		booleanCluster = 1;
		d3.range(d3.min(weekCluster), d3.max(weekCluster)+1, 1).forEach(function(d) {
			if (!(weekCluster.indexOf(d)+1)) {if (booleanCluster) { group++; booleanCluster=0; }}
			else {cluster[d] = group; booleanCluster=1;}
		})
		data.forEach(function(d,i) { data[i].group = cluster[+d.taken_month] } )
		///////////////////////////////////////////
		// sort the data by group
		data.sort(function(a, b){return b.group-a.group});
		dataPoints = []
		infectCount = {}
		console.log(data);
		data.forEach(function(d) {
			a = +d.antibody;
			year1 = d.taken_year;
			week1 = d.taken_month; 
			date1 = parseTime(week1+"/"+year1);
			year2 = d.infected_year;
			week2 = d.infected_month;
			(year2!="0") ? date2 = parseTime(week2+"/"+year2) : date2 = -1;
			if (year2!="0") {
				if (typeof infectCount[date2] == "undefined") infectCount[date2] = 0;
				infectCount[date2] = infectCount[date2] +1;
			}
			dataPoints.push({"antibody":a,"taken_week":+week1,"taken":date1,"infected":date2,"infected_week":+week2,"infectCounter":infectCount[date2],"group":d.group})
		})
		
		// object into array
		infectHistogram = []
		for (i in infectCount) {
			infectHistogram.push({"date":i,"count":infectCount[i]})
		}
		
		// in this case, we are only mapping the "taken date" vs "the antibody count"
		// d3.extent will find BOTH the lower and upper bounds of an array (min and max)
		// both the x1 and x2 will be same domains (the extreme min and max of infected and taken dates)
		leftside = d3.extent(dataPoints.filter(function(e) {return e.infected != -1}), function(d) {  return d.infected; })[0]
		rightside = d3.extent(dataPoints.filter(function(e) {return e.infected != -1}), function(d) {  return d.taken; })[1]
		x1.domain([leftside,rightside])
		x2.domain([leftside,rightside])		
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
			
		// add a background rectangle of the original subset of data points (based on cluster numbers)	
		rectBackground = {}
		for (i = 0; i <= group; i++) { rectBackground[i] = {}; rectBackground[i].x0 = 99999; rectBackground[i].y0 = 99999; rectBackground[i].x1 = -99999; rectBackground[i].y1 = -99999; }
		dataPoints.filter(function(d) { return (d.infected!=-1)}).forEach(function(d) {
			console.log(d.group);
			if (rectBackground[d.group].x0>x1(d.taken)) rectBackground[d.group].x0 = x1(d.taken);
			if (rectBackground[d.group].y0>y1(d.antibody)) rectBackground[d.group].y0 = y1(d.antibody);
			if (rectBackground[d.group].x1<x1(d.taken)) rectBackground[d.group].x1 = x1(d.taken);
			if (rectBackground[d.group].y1<y1(d.antibody)) rectBackground[d.group].y1 = (h/2);
		})
		rectArray = [];
		// add rectangles (color uniquely by group cluster)
		for (i in rectBackground) rectArray.push({"group":+i,"x":rectBackground[i].x0-10,"y":rectBackground[i].y0-10,"width":(rectBackground[i].x1-rectBackground[i].x0)+20,"height":(rectBackground[i].y1-rectBackground[i].y0)+20 })
		svg.selectAll("rect.background")
			.data(rectArray).enter().append("rect")
			.attr("class", "background")
			.attr("fill", function(d) { return color(d.group)})
			.style("fill-opacity", .1)
			.style("stroke", function(d) { return color(d.group)})
			.style("stroke-width", "2px")
			.style("stroke-opacity", .1)
			.attr("x", function(d) { return d.x})
			.attr("y", function(d) { return d.y})
			.attr("width", function(d) { return d.width})
			.attr("height", function(d) { return d.height})	
			
		// add lines from the starting positions of nodes in taken to ending positions in infected
		svg.selectAll("line.connections")
			.data(dataPoints.filter(function(d) { return (d.infected!=-1)})).enter().append("line")
			.attr("class", "connections")	
			.attr("id", "noid")
			.attr("fill", "none")
			.style("stroke", function(d) { return "grey"})
			.style("stroke-width", "2px")
			.style("stroke-opacity", .4)
			.attr("x1", function(d) { return x1(d.taken)})
			.attr("y1", function(d) { return y1(d.antibody)})
			.attr("x2", function(d) { return x1(d.taken)})
			.attr("y2", function(d) { return y1(d.antibody)});				
			
		// create the points for 0 or N\A values
		svg.selectAll("circle.datapoints1")
			.data(dataPoints.filter(function(d) { return (d.infected==-1)})).enter().append("circle")
			.attr("class", "datapoints1")
			.attr("fill", "none")
			.style("stroke", function(d) { return color(d.group)})
			.style("stroke-width", "2px")
			.style("stroke-opacity", 1)
			.attr("cx", function(d) { return x1(d.taken)})
			.attr("cy", function(d) { return y1(d.antibody)})
			.attr("r", 5);	
		// create the points for all others
		svg.selectAll("circle.datapoints2")
			.data(dataPoints.filter(function(d) { return (d.infected!=-1)})).enter().append("circle")
			.attr("class", "datapoints2")
			.attr("fill", "none")
			.style("stroke", function(d) { return color(d.group)})
			.style("stroke-width", "2px")
			.style("stroke-opacity", 1)
			.attr("cx", function(d) { return x1(d.taken)})
			.attr("cy", function(d) { return y1(d.antibody)})
			.attr("r", 5)
			.on("mouseover", function(d,i) { console.log(i) });	
		
		// add a line to show where the cut off values are for N/A or 0 values
		svg.append("line")
			.attr("class", "criticalLine")
			.attr("fill", "none")
			.style("stroke", function(d) { return "black"})
			.style("stroke-width", "2px")
			.style("stroke-opacity", .5)
			.attr("x1", function(d) { return adjustLeft/2})
			.attr("y1", function(d) { return y1(d3.max(dataPoints.filter(function(d) { return (d.infected==-1)}),function(e){return e.antibody}))  })
			.attr("x2", function(d) { return adjustLeft/2})
			.attr("y2", function(d) { return y1(d3.max(dataPoints.filter(function(d) { return (d.infected==-1)}),function(e){return e.antibody}))  })
			
		// Chained transitions (change the "onclick event" for each transition)
		// 1) add the cut-off line to the graph (addline())
		// 2) remove circles below this threashold and remove cut-off line (removeLowValues())
		// 3) move nodes from taken date vs. antibody value -> infected date vs antibody count (// object into array());
		addline()	
			
		function addline() {
			svg.on("click", function() { 	
				svg.select("line.criticalLine")		
					.attr("x2", function(d) { return w})
					.transition()
					.duration(1000)
					.attrTween("stroke-dasharray", function() {
						var len = this.getTotalLength();
						return function(t) { return (d3.interpolateString("0," + len, len + ",0"))(t) };
					})
					
				removeLowValues()
			})
		}
		function removeLowValues(){
			svg.on("click", function() { 
				svg.selectAll("circle.datapoints1").transition("circles").duration(2000).delay(function(d, i) {  return ((group-d.group)*200)+i; })
					.attr("cx", function(d) { return 0})
					.attr("cy", function(d) { return h/2})
					
				svg.select("line.criticalLine")		
					.transition("line")
					.style("stroke-opacity", 0)
					
				transitionCircles()
			})
		}			
		
		function transitionCircles() {
			svg.on("click", function() { 
				svg.selectAll("circle.datapoints2")
					.transition("circles")
					.duration(5000)
					.delay(function(d, i) { return ((group-d.group)*5000)+d.antibody; })
					.attr("fill", function(d) { return color(d.group)})
					.attr("cx", function(d) { return (d.infected==-1) ?  0 : x2(d.infected)})
					.attr("cy", function(d) { return (d.infected==-1) ?  h/2 : y2(d.infectCounter)})
				svg.selectAll("line.connections")
					.transition("lines")
					.duration(5000)
					.delay(function(d, i) { return ((group-d.group)*5000)+d.antibody; })
					.style("stroke-opacity", 0)
					.attr("x2", function(d) { return x2(d.infected)})
					.attr("y2", function(d) { return y2(d.infectCounter)});			
			
			})		
		}
	})	
}