//Width and height
var w = 1200;
var h = 1000;

var color = d3.scaleThreshold()
    .domain([1, 10, 50, 200, 500, 1000, 2000, 4000])
    .range(d3.schemeOrRd[9]);

var covidColor = d3.scaleThreshold()
    .domain([100, 500, 1000, 1500, 2000, 2500, 3000])
    .range(d3.schemeReds[8]);


var alternateColor = d3.scaleThreshold()
    .domain([1, 10, 50, 200, 500, 1000, 2000, 4000])
    .range(d3.schemeGnBu[9]);

var x = d3.scaleSqrt()
    .domain([0, 4500])
    .rangeRound([440, 950]);

var x2 = d3.scaleSqrt()
    .domain([0, 4500])
    .rangeRound([450, 950]);


var projection = d3.geoAlbersUsa().translate([-4300,1400]).scale([17000]);

var path = d3.geoPath().projection(projection);


//Create SVG element
var svg = d3.select(".container")
    .append("svg")
    .attr("width", w)
    .attr("height", h);



d3.json("data_final/states.json").then(function(states) {

   var subcounties;
   var legend;
   var countyData;
   var counties;
   var covidLegend;

   states = states.features;

   

	//Subcounties Geojson data
	d3.json("data_final/mygeodata_merged.json").then(function(data) {
    console.log(data);
   
    data = data.features;

	    d3.json("data_final/population.json").then(function(populationData){
	  	
	   	for(i = 0; i < data.length; i++){
	    	for(j = 0; j < populationData.length; j++){
	    		if(parseInt(data[i].properties.COUSUBFP) === parseInt(populationData[j][3])){
	    			//console.log(data[i].properties.ALAND);
	    			data[i].properties.populationDensity = parseInt(populationData[j][0])/parseFloat(data[i].properties.ALAND * 0.00000038610215855);
	    			//console.log(data[i].properties.populationDensity);
	    		}
	    	}
	    }

	    //console.log(fixPopulationDensity.domain());

	    //console.log(data);

	    //Drawing subcounties and population density
	    subcounties = svg.selectAll(".subcounty")
	        .data(data)
	        .enter()
	        .append("path")
	        .attr("class", "subcounty")
	        .attr("stroke", function(d){
	        	return color(d.properties.populationDensity); 
	        })
	        .attr("fill", function(d){ 
	        	//console.log(fixPopulationDensity(d.properties.populationDensity));
	        	return color(d.properties.populationDensity); })
	        .attr("d", path);


	   })
//County Line Geojson
	countyData = d3.json("data_final/counties-fixed.json").then(function(data) {


	   data = data.features;
	   counties = [];


	   for(i = 0; i < data.length; i++){
	   	  if(data[i].id > 34000 && data[i].id < 34042){
	   	  	counties.push(data[i]);
	   	  }
	   }


	    svg.selectAll(".counties")
	        .data(counties)
	        .enter()
	        .append("path")
	        .attr("class", "counties")
	        .attr("stroke", "grey")
	        .attr("fill", "none")
	        .attr("d", path);


	    svg.selectAll(".state")
        .data(states)
        .enter()
        .append("path")
        .attr("class", "state")
        .attr("stroke", "none") 
        .attr("fill", "none")
        .attr("stroke-width", "2px")
        .attr("d", path);

	    

        legend = svg.append("g")
	    .attr("class", "key")
	    .attr("transform", "translate(-160, 900)");

		legend.selectAll("rect")
		  .data(color.range().map(function(d) {
		      d = color.invertExtent(d);
		      if (d[0] == null) d[0] = x.domain()[0];
		      if (d[1] == null) d[1] = x.domain()[1];
		      return d;
		    }))
		  .enter().append("rect")
		    .attr("height", 8)
		    .attr("x", function(d) { return x(d[0]); })
		    .attr("width", function(d) { return x(d[1]) - x(d[0]); })
		    .attr("fill", function(d) { return color(d[0]); });

		legend.append("text")
		    .attr("class", "caption")
		    .attr("x", x.range()[0])
		    .attr("y", -6)
		    .attr("z", 3)
		    .attr("fill", "#000")
		    .attr("text-anchor", "start")
		    .attr("font-weight", "bold")
		    .text("Population per square mile");

		legend.call(d3.axisBottom(x)
		    .tickSize(13)
		    .tickValues(color.domain()))
		  .select(".domain")
		    .remove();


	    /* Dynamically loading COVID-19 data from NYT database */
		d3.csv("https://raw.githubusercontent.com/nytimes/covid-19-data/master/live/us-counties.csv").then(function(covidData){
			

			covidData.filter(function(row){
				if(row['state'] == 'New Jersey'){
					for(i = 0; i < counties.length; i++){
						if(counties[i].id == row['fips']){
							counties[i].properties.date = row['date'];
							counties[i].properties.cases = row['cases'];
							counties[i].properties.deaths = row['deaths'];
						}
					}
				}
			})
			console.log(counties);
		})
	})

	})

	var covidToggled = false;



	/* Button handler to change color scheme */
	var changeScheme = d3.select("#changeColor");
	var blue = false;

	changeScheme.on("click", function(){
		if(!blue && !covidToggled){
			blue = true;
			svg.selectAll(".subcounty")
	        .attr("fill", function(d){ 
	        	//console.log(fixPopulationDensity(d.properties.populationDensity));
	        	return alternateColor(d.properties.populationDensity); })
	        .attr("stroke", function(d){
	        	return alternateColor(d.properties.populationDensity); 
	        });
	        legend.selectAll("rect")
	        	.attr("fill", function(d) { return alternateColor(d[0]); });
		}else if(!covidToggled){
			blue = false;
			svg.selectAll(".subcounty")
	        .attr("fill", function(d){ 
	        	//console.log(fixPopulationDensity(d.properties.populationDensity));
	        	return color(d.properties.populationDensity); })
	        .attr("stroke", function(d){
	        	return color(d.properties.populationDensity); 
	        });

	        legend.selectAll("rect")
	        	.attr("fill", function(d) { return color(d[0]); });
		}
		
	})


	/* Button handler to toggle state boundaries */
	var toggleStates = d3.select("#stateBoundary");
	var toggledStates = false;

	toggleStates.on("click", function(){
		if(!toggledStates){
			toggledStates = true;

			svg.selectAll(".state")
				.attr("stroke", "lightgray");
		}else{
			toggledStates = false;

			svg.selectAll(".state")
				.attr("stroke", "white");
		}
	})


	/* Button handler to toggle census tract boundaries */
	var toggleCensusTract = d3.select("#censusBoundary");
	var censusToggled = false;

	toggleCensusTract.on("click", function(){
		if(covidToggled){
			if(!censusToggled){
				censusToggled = true;

				svg.selectAll(".subcounty")
				.attr("stroke", "grey");
			}else{
				censusToggled = false;
				svg.selectAll(".subcounty")
				.attr("stroke", "none");
			}
			
		}
		else if(!censusToggled){
			censusToggled = true;

			svg.selectAll(".subcounty")
				.attr("stroke", "grey");
		}else{
			censusToggled = false;

			if(!blue){
				svg.selectAll(".subcounty")
					.attr("stroke", function(d){return color(d.properties.populationDensity); })
			}else{
				svg.selectAll(".subcounty")
					.attr("stroke", function(d){return alternateColor(d.properties.populationDensity); })
			}
			
		}
	})


	/* Button handler to toggle COVID-19 data */
	var covidButton = d3.select("#covidData");

	covidButton.on("click", function(){
		if(!covidToggled){
			covidToggled = true;

			toggledStates = true;
			svg.selectAll(".state")
				.attr("stroke", "lightgray");

			//Hide legend
			legend.attr("visibility", "hidden");

			var perHundredThousand;
			svg.selectAll(".subcounty")
				.attr("fill", function(x){
					var countyId = (x.properties.STATEFP).concat(x.properties.COUNTYFP);

					for(i = 0; i < counties.length; i++){
						if(countyId == counties[i].id){
							//let cases = parseInt(counties[i].properties.cases);
							//let population = parseInt(counties[i].properties.population);
							//console.log(counties[i]);
							//console.log(cases, population);
							let rate = parseInt(counties[i].properties.cases)/parseInt(counties[i].properties.population);
							perHundredThousand = rate * 100000;
							return covidColor(perHundredThousand);

						}
					}
					
				})
				.attr("stroke", function(x){
					var countyId = (x.properties.STATEFP).concat(x.properties.COUNTYFP);

					for(i = 0; i < counties.length; i++){
						if(countyId == counties[i].id){
							//let cases = parseInt(counties[i].properties.cases);
							//let population = parseInt(counties[i].properties.population);
							//console.log(counties[i]);
							//console.log(cases, population);
							let rate = parseInt(counties[i].properties.cases)/parseInt(counties[i].properties.population);
							perHundredThousand = rate * 100000;
							
							return covidColor(perHundredThousand);

						}
					}
					
				});

				covidLegend = svg.append("g")
			    .attr("class", "key")
			    .attr("transform", "translate(-160, 900)");

				covidLegend.selectAll("rect")
				  .data(covidColor.range().map(function(d) {
				      d = covidColor.invertExtent(d);
				      if (d[0] == null) d[0] = x2.domain()[0];
				      if (d[1] == null) d[1] = x2.domain()[1];
				      return d;
				    }))
				  .enter().append("rect")
				    .attr("height", 8)
				    .attr("x", function(d) { return x2(d[0]); })
				    .attr("width", function(d) { return x2(d[1]) - x2(d[0]); })
				    .attr("fill", function(d) { return covidColor(d[0]); });

				covidLegend.append("text")
				    .attr("class", "caption")
				    .attr("x", x2.range()[0])
				    .attr("y", -6)
				    .attr("z", 3)
				    .attr("fill", "#000")
				    .attr("text-anchor", "start")
				    .attr("font-weight", "bold")
				    .text("Cases Per 100,000 People");

				covidLegend.call(d3.axisBottom(x2)
				    .tickSize(13)
				    .tickValues(covidColor.domain()))
				    .select(".domain")
				    .remove();






		}else{
			covidToggled = false;
			covidLegend.attr("visibility", "hidden");
			legend.attr("visibility", "visible");

			if(blue){
				blue = true;
				svg.selectAll(".subcounty")
		        .attr("fill", function(d){ 
		        	//console.log(fixPopulationDensity(d.properties.populationDensity));
		        	return alternateColor(d.properties.populationDensity); })
		        .attr("stroke", function(d){
	        	return alternateColor(d.properties.populationDensity); 
	        	});
		        legend.selectAll("rect")
		        	.attr("fill", function(d) { return alternateColor(d[0]); });
			}else{
				blue = false;
				svg.selectAll(".subcounty")
		        .attr("fill", function(d){ 
		        	//console.log(fixPopulationDensity(d.properties.populationDensity));
		        	return color(d.properties.populationDensity); })
		        .attr("stroke", function(d){
	        	return color(d.properties.populationDensity); 
	        	});

		        legend.selectAll("rect")
		        	.attr("fill", function(d) { return color(d[0]); });
		        }

		}
	})




})

