const FIRE_TYPES = [
  "Arson",
  "Campfire",
  "Debris Burning",
  "Electrical Power",
  "Equipment Usage",
  "Lightning",
  "Misc.",
  "Play With Fire",
  "Railroad",
  "Smoking",
  "Undetermined",
  "Vehicle",
  "Total" // not sure if to keep this or to calculate on own
];
const FIRE_CATEGORIES = [
  "Count", // number of fires
  "Acres", // acres burned
  "Dollars" // damage in dollars
];
const FIRE_YEARS = [
  "2008",
  "2009",
  "2010",
  "2011",
  "2012",
  "2013",
  "2014",
  "2015",
  "2016"
];
const COUNTY_KEY = "COUNTY";
const CONTRACT_COLOR = d3.rgb(210, 210, 210);
formatNumbers = d3.format(",");

var fireData; 
var selectedCategory;

class FireGeomap {
  constructor(svg, geo_data, fire_data) {
    this.svg = svg;

    fireData = fire_data;
    // data file to be stored in this
    this.data = geo_data;
    this.selected_county = "";

    // stores information about each county (map refers to the data structure, not visual)
    // sample usage: fire_map['Santa Cruz']['Arson']
    this.fire_map = d3.map();
    this.update_fire_map_year(fire_data);

    //console.log(this.fire_map);

    this.projection = d3.geoMercator();
    this.path = d3.geoPath(this.projection);

    // identifies current selected key (arson, etc.)
    this.selected_type = "Total";
    this.selected_category = "Count";
    this.selected_year = "2008";

    // color scale variables
    this.scale_max = 0;
    this.color_scale = d3.scaleThreshold();

    // init legend
    this.legend_x = d3.scaleLinear().rangeRound([500, 950]);
    this.legend_g = svg
      .append("g")
      .attr("class", "legend")
      .attr("transform", "translate(0, 40)");

    this.legend_g
      .append("text")
      .attr("class", "caption")
      .attr("x", this.legend_x.range()[0])
      .attr("y", -6)
      .attr("fill", "#000")
      .attr("text-anchor", "start")
      .attr("font-weight", "bold");

    this.init_geomap();
  }

  update_color_scale() {
    this.scale_max = this.get_max_data();
    this.color_scale.domain(schemize_nums(this.scale_max, 5));

    let rng = undefined;
    if (this.selected_category === "Count") rng = d3.schemeOrRd[6];
    else if (this.selected_category === "Acres") rng = d3.schemeReds[6];
    else if (this.selected_category === "Dollars") rng = d3.schemeGreens[6];
    this.color_scale.range(rng);

    this.legend_x.domain([0, this.scale_max]);

    let color_scale = this.color_scale;
    let x = this.legend_x;

    this.legend_g.selectAll("rect").remove();
    this.legend_g
      .selectAll("rect")
      .data(
        color_scale.range().map(function(d) {
          d = color_scale.invertExtent(d);
          return d;
        })
      )
      .enter()
      .append("rect")
      .attr("height", 8)
      .attr("x", function(d) {
        return x(d[0]);
      })
      .attr("width", function(d) {
        return x(d[1]) - x(d[0]);
      })
      .attr("fill", function(d) {
        return color_scale(d[0]);
      });

    this.legend_g.select("g").remove();
    this.legend_g.append("g").call(
      d3
        .axisBottom(this.legend_x)
        .tickSize(13)
        .tickValues(this.color_scale.domain())
    );

    let text = "";
    if (this.selected_category === "Count") text = "Number of Fires";
    if (this.selected_category === "Acres") text = "Acres Burned";
    if (this.selected_category === "Dollars")
      text = "Damage in Dollars";

    this.legend_g.select("text").text(text);
  }

  get_selected_by_name(name) {
    if (name === "type") return this.selected_type;
    if (name === "category") return this.selected_category;
    if (name === "year") return this.selected_year;
    console.error("Cannot get unrecognized selected key name: " + name);
    return undefined;
  }

  set_selected_by_name(name, value) {
    if (name === "type") this.selected_type = value;
    else if (name === "category") this.selected_category = value;
    else if (name === "year") this.selected_year = value;
    else console.error("Cannot set unrecognized selected key name: " + name);
  }

  // updates fire map
  update_fire_map_year(fire_data) {
    Object.keys(fire_data).forEach(year => {
      this.update_fire_map(fire_data[year], year);
    });
  }

  // updates fire map that includes fire_data with year
  update_fire_map(fire_data, year) {
    fire_data.forEach(d => {
      if (d[COUNTY_KEY] === undefined) {
        console.error("Invalid county key: " + FireGeomap.county_key);
        return;
      }

      // create county index if it doesnt exist
      // SLOPPY
      let county_name = d[COUNTY_KEY];
      if (this.fire_map[county_name] === undefined) {
        this.fire_map[county_name] = {};
        FIRE_CATEGORIES.forEach(category => {
          this.fire_map[county_name][category] = {};
        });
      }
      FIRE_CATEGORIES.forEach(category => {
        this.fire_map[county_name][category][year] = {};
      });

      // set values for each fire type for the current county
      FIRE_TYPES.forEach(key => {
        FIRE_CATEGORIES.forEach(category => {
          let key_name = key + " " + category;
          if (d[key_name] === undefined) {
            console.error(year + " Invalid fire type key: " + key_name);
            // -1 refers to missing data
            this.fire_map[county_name][category][year][key] = -1;
          } else {
            this.fire_map[county_name][category][year][key] = d[key_name];
          }
        });
      });
    });
  }

  // creates the geomap skeleton
  init_geomap() {
    this.projection
      .fitExtent([[20, 20], [width/2, height]], this.data);

    // sets county variable for each piece of data
    this.data.features.forEach(d => {
      d.county = d.properties.NAME_2;
    });

    // creates barebones geomap
    this.svg
      .append("g")
      .attr("class", "counties")
      .selectAll("path")
      .data(this.data.features)
      .enter()
      .append("path")
      .attr("class", "county")
      .attr("id", function(d){ return d.county.split(" ").join(""); })
      .attr("d", this.path)
      .attr("stroke", "#000")
      .attr("stroke-opacity", 0.3)
      .on("click", function(d){

        fire_geomap.selected_county = d.county;

        svg.selectAll(".county")
          .attr("stroke", "black")
          .attr("stroke-opacity", 0.3)
          .attr("stroke-width", 1);


        let countyData = formatData(fireData, d.county);

        /* Fixing up some data to draw our line chart with */
        

        svg.select(`#${d.county.split(" ").join("")}`)
            .attr("stroke", "blue")
            .attr("stroke-width", 3)
            .attr("stroke-opacity", 1);

        drawGraph(d.county, countyData);

      })
      .append("title");

    this.update_geomap();
  }

  get_selected_data(county) {
    if (this.fire_map[county] === undefined) {
      //console.error("County does not exist in fire map: " + county);
      return -1;
    }
    if (this.fire_map[county][this.selected_category] === undefined) {
      /*console.error(
        "Category does not exist for " +
          county +
          " county : " +
          this.selected_category
      );
      */
      return -1;
    }
    if (
      this.fire_map[county][this.selected_category][this.selected_year] ===
      undefined
    ) {
      /*
      console.error(
        "Year does not exist for " +
          county +
          " county " +
          this.selected_category +
          ": " +
          this.selected_year
      );
      */
      return -1;
    }
    return parseFloat(this.fire_map[county][this.selected_category][this.selected_year][
      this.selected_type
    ]);
  }

  get_max_data() {
    let counties = [];
    let arr = this.data.features;
    for (var i = 0; i < arr.length; ++i) {
      counties.push(arr[i].county);
    }
    let max = 0;
    for (var i = 0; i < counties.length; ++i) {
      let county = counties[i];
      let selected_data = +this.get_selected_data(county);

      if (i == 0 || selected_data > max) {
        console.log(max, selected_data);
        max = selected_data;
      }
    }
    console.log("max:" + max);
    return max;
  }

  // updates the geomap based on the current selected key(s)
  update_geomap() {
    this.update_color_scale();
    svg
      .select(".counties")
      .selectAll("path")
      .attr("fill", (d, id) => {
        if (this.fire_map[d.county] === undefined) {
          //console.error("County not listed in report: " + d.county);
          d.contract_county = true;
          return CONTRACT_COLOR;
        } else {
          d.contract_county = false;
          //console.log(d.county + " " + this.selected_category + " " + this.selected_year + " " + this.selected_type);
          let val = this.get_selected_data(d.county);
          //console.log(val);
          if (val < 0) return CONTRACT_COLOR;
          return this.color_scale(val);
        }
      })
      .select("title")
      .text(d => {
        let value = 0;
        if (this.fire_map[d.county] != undefined) {
          value = this.get_selected_data(d.county);
          //value = formatNumbers(value);
        }

        let ending = "";
        if (this.selected_category === "Count") ending = "Fires";
        if (this.selected_category === "Acres") ending = "Acres Burned";
        if (this.selected_category === "Dollars") {
          ending = "Dollars in Damage";
        }

        let message = formatNumbers(value) + " " + ending;
        if (value < 0) message = "N/A";
        if (d.contract_county) message = "Contract County";



        return `${d.county}: ${message}`;
      });
  }
}

// Abstract class
class GeomapInput {
  constructor(geomap, selected_key_name) {
    this.geomap = geomap;
    this.selected_key_name = selected_key_name;

    if (this.constructor === GeomapInput) {
      throw new TypeError(
        'Abstract class "Widget" cannot be instantiated directly.'
      );
    }

    if (this.create_input === undefined || this.get_input === undefined) {
      throw new TypeError("Classes extending the widget abstract class");
    }
  }
}

class GeomapSlider extends GeomapInput {
  constructor(geomap, list_data, selected_key_name) {
    super(geomap, selected_key_name);
    this.list_data = list_data;
    this.input = this.create_input();
  }
  create_input() {
    // Create select dropdown
    //console.log(d3.min(this.list_data));

    let slider = d3
      .sliderHorizontal()
      .step(1)
      .tickFormat(d3.format(""))
      .width(800)
      .min(d3.min(this.list_data))
      .max(d3.max(this.list_data))
      .default(this.geomap.get_selected_by_name(this.selected_key_name));

    let slider_g = d3
      .select(".container-slider")
      .append("div")
      .attr("class", "slider")
      .append("svg")
      .attr("width", 1000)
      .attr("height", 100)
      .append("g")
      .attr("transform", "translate(150,30)");

    slider_g.call(slider);

    // add listener for dropdown change
    slider.on("onchange", value => {
      this.geomap.set_selected_by_name(this.selected_key_name, value);
      this.geomap.update_geomap();
    });

    return slider_g;
  }

  get_input() {
    return this.input;
  }
}

class GeomapSelect extends GeomapInput {
  constructor(geomap, list_data, selected_key_name) {
    super(geomap, selected_key_name);
    this.list_data = list_data;
    this.input = this.create_input();
  }
  create_input() {
    // Create select dropdown
    let select_lb = d3
      .select(".select-holder")
      .append("label")
      .attr("class", "dropdown")
      .text("Fire Type: ")
      .style("font-weight", "bold")
      .style("left", "280px")
      .style("top", "-710px");

    let select_dd = select_lb
      .append("select");

    select_dd
      .selectAll("option")
      .data(this.list_data)
      .enter()
      .append("option")
      .text(d => {
        return d;
      });

    select_dd.property(
      "value",
      this.geomap.get_selected_by_name(this.selected_key_name)
    );

    // add listener for dropdown change
    select_dd.on("change", () => {
      let select_value = select_dd.property("value");
      this.geomap.set_selected_by_name(this.selected_key_name, select_value);
      this.geomap.update_geomap();
    });

    return select_lb;
  }

  get_input() {
    return this.input;
  }
}

class GeomapButton extends GeomapInput {
  constructor(geomap, button_value, selected_key_name, button_text) {
    super(geomap, selected_key_name);
    this.button_value = button_value;
    if (button_text === undefined) this.button_text = this.button_value;
    else this.button_text = button_text;
    this.input = this.create_input();
  }
  create_input() {
    // Create select dropdown
    let button = d3
      .select(".container-btn")
      .append("input")
      .attr("type", "button")
      .attr("class", "button");

    button.property("value", this.button_text);

    // add listener for dropdown change
    button.on("click", () => {
      let select_value = this.button_value;
      this.geomap.set_selected_by_name(this.selected_key_name, select_value);
      this.geomap.update_geomap();


      drawGraph(fire_geomap.selected_county, formatData(fireData, fire_geomap.selected_county));

    });

    return button;
  }

  get_input() {
    return this.input;
  }
}

let svg = d3.select("svg"),
  width = +svg.attr("width"),
  height = +svg.attr("height");

// load the data, runs ready when it's ready
d3.queue()
  .defer(d3.json, "ca2.json")
  // perhaps less hardcodey if i find a better alternative
  .defer(d3.csv, "2016_fires.csv")
  .defer(d3.csv, "2015_fires.csv")
  .defer(d3.csv, "2014_fires.csv")
  .defer(d3.csv, "2013_fires.csv")
  .defer(d3.csv, "2012_fires.csv")
  .defer(d3.csv, "2011_fires.csv")
  .defer(d3.csv, "2010_fires.csv")
  .defer(d3.csv, "2009_fires.csv")
  .defer(d3.csv, "2008_fires.csv")
  .await(ready);

var fire_geomap;
// To be done after data is all loaded
function ready(
  error,
  geo_data,
  // see above
  fd16,
  fd15,
  fd14,
  fd13,
  fd12,
  fd11,
  fd10,
  fd9,
  fd8
) {
  if (error) throw error;
  let fire_data = {
    // see above
    "2008": fd8,
    "2009": fd9,
    "2010": fd10,
    "2011": fd11,
    "2012": fd12,
    "2013": fd13,
    "2014": fd14,
    "2015": fd15,
    "2016": fd16
  };

  //console.log(fire_data);

  fire_geomap = new FireGeomap(svg, geo_data, fire_data);
  type_select = new GeomapSelect(fire_geomap, FIRE_TYPES, "type");
  //fire_lineChart = new lineChart(svg, geo_data, fire_geomap);

  count_btn = new GeomapButton(
    fire_geomap,
    "Count",
    "category",
    "Number of Fires"
  );
  acres_btn = new GeomapButton(
    fire_geomap,
    "Acres",
    "category",
    "Acres Burned"
  );
  acres_btn.get_input().attr("class", "button red");

  dollars_btn = new GeomapButton(
    fire_geomap,
    "Dollars",
    "category",
    "Dollar Damage"
  );

  dollars_btn.get_input().attr("class", "button green");
  year_slider = new GeomapSlider(fire_geomap, FIRE_YEARS, "year");
}


/* Data Formatting  for Line Chart */
function formatData(data, county){

  let countyData = [];
  for(const year in fireData){
    let yearData = fireData[year];

    for(let i = 0; i < yearData.length; i++){
      if(yearData[i].COUNTY === county){
        yearData[i]["Year"] = year;
        countyData.push(yearData[i]);
      }
    }
  }

  return countyData;
}
/* County Line Chart Addition */


var RHS = svg.append("g")
  .attr("width", width/2 - 50)
  .attr("height", height)
  .attr("transform", "translate(" + (width/2 + 80) + "," + 0 + ")")
  .attr("opacity", "1");

  RHS.append("text")
        .attr("x", + width/4 - 200)
        .attr("y", + height/2 - 100)
        .attr("dy", "1em")
        .style("text-anchor", "middle")
        .style("font-size", "40px")
        .style("font-weight", "bold")
        .text("Click on a county to\nview county data");




// Defines range and style for x and y axis
var xScale = d3.scaleLinear().range([0, width/3 + 50]).domain([2008, 2016]);

var yScale = d3.scaleLinear().range([height - 90, 200]);

// Define X and Y AXIS
var xAxis = d3.axisBottom(xScale).tickFormat(d3.format("d"));

//Hardcoding values for Y axis ticks, seems like a bad practice
var yAxis = d3.axisLeft(yScale);

var line = d3.line()
    //.curve(d3.curveBasis)
    .x(function(d) { return xScale(d.year); })
    .y(function(d) { return yScale(d.data); });



function drawGraph(countyName, data){

  RHS.selectAll("*").remove();

  let isEmpty = true;

  let lineData = [];


  //Set the domain of Y axis
  //Find min, max of our dataset for given count

  console.log(data);
  if(data.length < 4){
    RHS.append("text")
        .attr("x", + width/4 - 80)
        .attr("y", + height/2)
        .attr("dy", "1em")
        .style("text-anchor", "middle")
        .style("font-size", "40px")
        .style("font-weight", "bold")
        .text("Not Enough Data");
  }else{

    if(fire_geomap.selected_category === "Count"){

      yAxis.tickFormat(d3.format(','));
      yScale.domain([0, d3.max(data, function(data){
        return parseFloat(data["Total Count"])
      })]);

      data.map(function(x){
        lineData.push({year: x["Year"], data: x["Total Count"]});
      });

    }
    else if(fire_geomap.selected_category === "Acres"){

      yAxis.tickFormat(d3.format(','));

      yScale.domain([0, d3.max(data, function(data){
        return parseFloat(data["Total Acres"])
      })]);

      data.map(function(x){
        lineData.push({year: x["Year"], data: x["Total Acres"]});
      });

    }

    else if(fire_geomap.selected_category === "Dollars"){
      yScale.domain([0, d3.max(data, function(data){
        return parseFloat(data["Total Dollars"])
      })]);

      yAxis.tickFormat(function(d){ return '$' + d3.format(',')(d); });


      data.map(function(x){
        lineData.push({year: x["Year"], data: x["Total Dollars"]});
      });
    }

    var drawPath = RHS.append("path")
      .attr("class", "line")
      .attr("d", line(lineData))
      .style("fill", "none")
      .attr("stroke-width", 3)
      .style("stroke", "blue");

  //Drawing y axis
  RHS.append("g")
      .attr("class", "y axis")
      .call(yAxis)
      .selectAll("text")
      .attr("dx", "-.8em")
      .attr("dy", ".25em")
      .style("text-anchor", "end")
      .attr("font-size", "15px");

  RHS.append("text")
      .attr("y", 220)
      .attr("x", -150)
      .attr("dy", "1em")
      .style("text-anchor", "middle")
      .style("font-size", "20px")
      .style("font-weight", "bold")
      .text(function(d){
        if(fire_geomap.selected_category === "Count"){
          return "Number of Fires";
        }
        else if(fire_geomap.selected_category === "Acres"){
          return "Acres Burned";
        }
        else if(fire_geomap.selected_category === "Dollars"){
          return "Dollar Damage";
        }
      });

  // Drawing x Axis
  RHS.append("g")
      .attr("class", "axis axis--x")
      .attr("transform", "translate(0," + (height - 90) + ")")
      .call(xAxis)
      .attr("font-size", "15px");

  RHS.append("text")
      .attr("y", height-65)
      .attr("x", width/3 + 60)
      .attr("dy", "1em")
      .style("text-anchor", "middle")
      .style("font-size", "20px")
      .style("font-weight", "bold")
      .text("Year");

  RHS.append("text")
        .attr("x", + width/4 - 80)
        .attr("y", + height - 40)
        .attr("dy", "1em")
        .style("text-anchor", "middle")
        .style("font-size", "25px")
        .style("font-weight", "bold")
        .text(countyName + " County");


  }

}