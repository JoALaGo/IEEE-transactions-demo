var core_hardware_consumption_matrix = [['CPU_usage', 'CPU'], ['RAM_usage', 'RAM'], ['storage_usage', 'Storage'], ['network_usage', 'Network']];
var profile_bcs = {};
var report_highlights ={};
var test_sequence;
var timing_diagram = '';
class Step {
    constructor() {
        this.by_state = [];
        this.by_operations = [];
        this.by_parameter = [];
        this.results_generated = [];
        this.description = '';
    }
}
class HardwareConsumption {
    constructor() {
        this.Cc = 0;
        this.Ca = 0;
        this.Rc = 0;
        this.Ra = 0;
        this.Nc = 0;
        this.Na = 0;
        this.Sc = 0;
        this.Sa = 0;
        this.Camera = '';
        this.camera_weight ='';
        this.Bluetooth = '';
        this.Bluetooth_weight = '';
        this.WIFI_usage = '';
        this.WIFI_usage_weight = '';
        this.GPS = '';
        this.GPS_weight = '';
        this.Screen_brightness = '';
        this.Screen_brightness_weight = '';
        this.cpuWeight = 0.3;//this weight is heavier because CPU consumes the battery AND generates residual heat
        this.ramWeight = 0.1;// this weight does not matter a lot because it is a constant source of consumption (the wattage required to keep ram is constant)
        this.netWeight = 0.5;// this weight is heavier because network consumes locally and remotely!
        this.storWeight = 0.1;
        //we get the qualitative consumption for each element from the profile and the quantitative consumption from the taxonomic guide
        this.HcS = '';
        this.SCS = '';
        this.BCS = '';//NOTE: THE PROPERTIES FOR THE BCS RELATED TO THE OPERATION ARE FETCHED INSIDE OF getRelativeConsumption()
        this.Ocs = '';
        

    }

    selfRateHcs() {
        console.log("HCS values: \n"+"  CPU consumption: "+this.Cc+"\n  RAM consumption: "+this.Rc+"\n  Network consumption: "+this.Nc+" \n  Storage consupmtion: "+this.Sc);
        this.HcS = (this.Cc / this.Ca * this.cpuWeight + this.Rc / this.Ra * this.ramWeight + this.Nc / this.Na * this.netWeight + this.Sc / this.Sa * this.storWeight) * 100;
        console.log("HCS score: "+this.HcS);
    }
    selfRateScs(){
        //we have to be sure that the sensorial consumption score has all the parameters filled in with a value, otherwise we should not assess it.
        if(this.Bluetooth == ''||this.Camera == ''||this.GPS == ''||this.WIFI_usage == ''){
            report_highlights['SCS'] ='<br><h6>There was an issue while calculating the Sensor Consumption Score: not all the sensors have a value assigned.</h6>';
        }else{
            let value_tabulator = {on:1,off:0,cirumstancial:0.5};
            
            let screen_brightness_tabulator = {unused:'',off:0,low:0.04,medium:0.06,high:0.1,auto:0.05};
            console.log("SCS values: \n"+"  Bluetooth: "+value_tabulator[this.Bluetooth]+"\n  GPS: "+value_tabulator[this.GPS]+"\n  Camera: "+value_tabulator[this.Camera]+"\n  Screen brightness: "+screen_brightness_tabulator[this.Screen_brightness]);
            this.SCS = (value_tabulator[this.Bluetooth] * this.Bluetooth_weight + value_tabulator[this.GPS] * this.GPS_weight+ value_tabulator[this.Camera]*this.camera_weight + screen_brightness_tabulator[this.Screen_brightness])*100;
            console.log("SCS score: "+this.SCS);
        }
        
    }

    selfRateBcs(self){
        let guide= JSON.parse('{"properties":[{"property":"task_distribution","possible_values":[{"value":"centralized","score":0.5},{"value":"decentralized","score":1}]},{"property":"computational_criticality","possible_values":[{"value":"low","score":0.3},{"value":"medium","score":0.6},{"value":"high","score":1}]},{"property":"computation_complexity","possible_values":[{"value":"low","score":0.3},{"value":"medium","score":0.6},{"value":"high","score":1}]},{"property":"distribution_strategy","possible_values":[{"value":"yes","score":0},{"value":"no","score":1}]},{"property":"consumption_rate","possible_values":[{"value":"definite","score":0},{"value":"indefinite","score":0.1}]},{"property":"data_flow_behavior","possible_values":[{"value":"regular","score":0.8},{"value":"irregular","score":0.4}]},{"property":"data_flow_direction","possible_values":[{"value":"unidirectional","score":0.5},{"value":"bidirectional","score":1}]},{"property":"data_handling","possible_values":[{"value":"keep","score":0.5},{"value":"destroy","score":0},{"value":"store and broadcast","score":0.5}]},{"property":"access_frequency","possible_values":[{"value":"regular","score":0},{"value":"irregular","score":0.5}]},{"property":"depth","possible_values":[{"value":"foreground","score":0.5},{"value":"background","score":0}]},{"property":"dependence","possible_values":[{"value":"dependee","score":0.5},{"value":"dependant","score":0.5},{"value":"independent","score":0}]}]}');

        //we have to be really careful here because the values of the operations override the values of the profile.
        //if a value of operation is empty, we use the profile, otherwise we override it with that of the operation
        //the easiest way to make this is to override the values from the beginning
        
        let profile_bcs_copy = JSON.parse(JSON.stringify(profile_bcs));
        //console.log(JSON.stringify(profile_bcs_copy));
        Object.entries(profile_bcs_copy).forEach(element => {
            //console.log(self);
            if(self.hasOwnProperty('operation_'+element[0])){
                profile_bcs_copy[element[0]] = self['operation_'+element[0]];
               
            }
        });

        console.log("BCS values: ");
            for(let x in guide.properties){
                let element = guide.properties[x].property;
                //console.log("Checking the guide score for property: "+element);
                if(profile_bcs_copy.hasOwnProperty(guide.properties[x].property)){
                   
                    //console.log("Property match: "+element+" to "+guide.properties[x].property);
                    //we now look for the actual quantitative value
                    for(let y in guide.properties[x].possible_values){
                        let guide_value = guide.properties[x].possible_values[y].value;
                        //console.log("Algorithm: GUIDE VALUE: "+guide_value+ " for "+guide.properties[x].property)+" usa: "+profile_bcs_copy[element];
                        if(profile_bcs_copy[element] == null && profile_bcs_copy[element] == '')
                        {
                            report_highlights['BCS']+= '<br> <h5>property '+element+' had no value.</h5>';
                            //console.log("ALGORITHM EXCEPTION "+element+" not found: "+guide.properties[x].property+" actual value: "+profile_bcs_copy[element]);
                        }else if(guide_value == profile_bcs_copy[element]){
                            profile_bcs_copy[element] = guide.properties[x].possible_values[y].score;
                            console.log("\n   "+element+": "+profile_bcs_copy[element] );
                            //console.log("Algorithm: Score for property: "+element+" with original value: "+guide_value+" is: "+guide.properties[x].possible_values[y].score);
                        }
                    }
                }else{
                    console.log("No Property match: "+profile_bcs_copy[element]+" to "+guide.properties[x].property);
                    //we now look for the actual quantitative value
                    
                }
            }
       
            //console.log("Self BCS values: "+JSON.stringify(profile_bcs_copy));
            
            //now we sum the score of each property
            var sum = 0.0;
            Object.entries(profile_bcs_copy).forEach( element => {
            
                //console.log("BCS sum: "+Number(sum)+" "+typeof sum+" adding: "+profile_bcs_copy[element[0]]+" type: "+ typeof profile_bcs_copy[element[0]]);
                sum += Number(profile_bcs_copy[element[0]]);
                
            });

            let report_text=[];
            let valid_combinations = [];

            //----------------Co: we check the combinations of the available properties to assign a final score-----------------
            let profile_bcs_mirror = Object.assign(new Object(),profile_bcs_copy);
            
                                    //A1                                            //B1
            if(profile_bcs_copy['task_distribution']== 1 && profile_bcs_copy['distribution_strategy']==1){
                
                profile_bcs_mirror['task_distribution'] = 0;
                profile_bcs_mirror['distribution_strategy'] = 0;
                console.log("C1 true");
                valid_combinations.push({tag:'C1',result:3});
                report_highlights.push({category:'BCS',content:'RADIANCE noted that the task distribution is set to distributed, the energy scores have been penalized for not having a distribution strategy, as network consumption to distribute the tasks could produce the risk of overloading other devices.',value:'negative'});
            }
                                 //A1                                               //B0
            if(profile_bcs_copy['task_distribution']== 1 && profile_bcs_copy['distribution_strategy']==0){
                profile_bcs_mirror['task_distribution'] = 0;
                
                console.log("C2 true");
                valid_combinations.push({tag:'C2',result:-1});
                report_highlights.push({category:'BCS',content:'Applying a proven deployment or distribution strategy should allow for further energy savings. This has affected the final energy score positively.',value:'positive'});

            }
                                    //c2                                                    //e0
            if(profile_bcs_copy['computational_criticality'] == 1 && profile_bcs_copy['data_flow_behavior'] == 0 && profile_bcs_copy['task_distribution']== 1 && profile_bcs_copy['distribution_strategy']==0){
                profile_bcs_mirror['task_distribution'] = 0;
                profile_bcs_mirror['data_flow_behavior'] = 0;
                
                console.log("C3 true");
                valid_combinations.push({tag:'C3',result:2});
                //we invalidate C2 
                for(let x in valid_combinations){
                    if(valid_combinations[x].tag == 'C2'){
                        valid_combinations[x].result = 0;
                        break;
                    }
                }
                report_highlights.push({category:'BCS',content:'You selected a regular flow of data , now that software components are distributed in a network more network usage (among devices) is required. Therefore, the energy consumption is can become unpredictable and the consumption score has been affected negatively.',value:'negative'});

            }

                                            //c2                                    //e1                                                //G2
            if(profile_bcs_copy['task_distribution']== 1 && profile_bcs_copy['distribution_strategy']==0 && profile_bcs_copy['data_flow_behavior'] == 0.4 && profile_bcs_copy['data_handling'] == 0.5){

                profile_bcs_mirror['task_distribution'] = 0;
                profile_bcs_mirror['data_flow_behavior'] = 0;
                profile_bcs_mirror['data_handling']  = 0;
                profile_bcs_mirror['computational_criticality'] == 0;

                
                valid_combinations.push({tag:'C4',result:-2});
                //we invalidate C2 
                for(let x in valid_combinations){
                    if(valid_combinations[x].tag == 'C2'){
                        valid_combinations[x].result = 0;
                        break;
                    }
                }

                report_highlights.push({category:'BCS',content:'A decentralized task distribution in addition to a strategy for distributing tasksand a strategy for broadcasting data could benefit (lower) the energy consumption by obtaining the most frugal execution and creating an easier to reach data node. This has positively affected the final consumption score.',value:'negative'});
            }
                                //c2                                                        //e1                                 // G1
            if(profile_bcs_copy['task_distribution']== 1 && profile_bcs_copy['distribution_strategy']==0 &&  profile_bcs_copy['data_flow_behavior'] == 0.4 &&  profile_bcs_copy['data_handling'] == 0){
                profile_bcs_mirror['task_distribution']== 0;
                profile_bcs_mirror['data_flow_behavior'] == 0;
                profile_bcs_mirror['data_handling'] == 0;
                profile_bcs_mirror['computational_criticality'] == 1;
                
                valid_combinations.push({tag:'C5',result:-1});
                //we invalidate C2 
                for(let x in valid_combinations){
                    if(valid_combinations[x].tag == 'C2'){
                        valid_combinations[x].result = 0;
                        break;
                    }
                }

                report_highlights.push({category:'BCS',content:'A decentralized task distribution in addition to a strategy for distributing tasksand a strategy for broadcasting data could benefit (lower) the energy consumption by obtaining the most frugal execution and creating an easier to reach data node. This has positively affected the final consumption score.',value:'negative'});

            }

            sum = 0.0;
            Object.entries(profile_bcs_mirror).forEach( element => {
            
                //console.log("BCS sum: "+Number(sum)+" "+typeof sum+" adding: "+profile_bcs_copy[element[0]]+" type: "+ typeof profile_bcs_copy[element[0]]);
                sum += Number(profile_bcs_mirror[element[0]]);
                
            });
            
            let Co = 0
            console.log("BCS after the logical effects of the combinations: "+sum);
            //---we add up Co--- 
            for(let x in valid_combinations){
                Co += valid_combinations[x].result;
            }
            console.log("BCS combinational score: "+Co);
            console.log("Combinations results: \n"+JSON.stringify(valid_combinations));

            this.BCS = Math.ceil((Co+sum));

    }

    selfOCS(){
        this.Ocs = this.BCS+this.SCS+this.HcS;
        console.log(report_highlights);
        console.log("Operation Ocs = "+this.Ocs);
    }
}


function fetchProfileBcs(profile){
    if(profile == null){
        profile = this.available_parents;
    }
    let computation_centric = Object.entries(profile[1][1]);
    let data_centric = Object.entries(profile[2][1]);
    let conduct_centric = Object.entries(profile[3][1]);
    
    let a = [computation_centric,data_centric,conduct_centric];

    a.forEach(category => {
        
        category.forEach(element => {
            profile_bcs[element[0]] = element[1];
        });
    });
}




function initTimingDiagram(root_profile) {
let profile;
    if(root_profile==null || root_profile == ''){
        profile = this.available_parents;
    }else{
        profile = root_profile;
    }
    
    //we initialize all the operations as robust
    let init = '\n <style>\n    timingDiagram {\n      .red {\n        LineColor red\n      }\n      .blue {\n        LineColor blue\n        LineThickness 3\n      }\n    }\n</style>\n scale 1 as 200 pixels';
    timing_diagram += init;
    let operations = profile[findPlaceByParentName('Operations', profile)][4];
    for (let x in operations) {
        timing_diagram += '\nrobust "' + operations[x].Name + '" as ' + operations[x].Name.split(' ').join('') + ' <' + '<' + 'blue' + '>' + '>';
    }

    timing_diagram += '\n @0';
    for (let x in operations) {
        timing_diagram += '\n' + operations[x].Name.split(' ').join('') + ' is Off';
    }
}


function getAlgoComponents(){
//we get the operational pathways of the profile in order to define what operations to rate in each step and how
var sequencer = [];
getProfileOperationalPathways(JSON.parse(this.element_to_edit.profile_cache), sequencer, 0);
//console.log("Algo: sequencer: "+JSON.stringify(sequencer));


// We create a hardware consumption guide with the availability:
let hardwareConsumption = new HardwareConsumption();

//we set the hardware availability to whatever we want
hardwareConsumption.Ca = 1.6;
hardwareConsumption.Ra = 16;
hardwareConsumption.Na = 2400;
hardwareConsumption.Sa = 256;
//We assign the weights here
hardwareConsumption.camera_weight =0.1;
hardwareConsumption.Bluetooth_weight = 0.35;
hardwareConsumption.WIFI_usage_weight = 0.35;
hardwareConsumption.GPS_weight = 0.2;


var sequencer_consumption = [];
for (let x in sequencer) {
    sequencer_consumption.push(rateStep(sequencer[x], x, hardwareConsumption));
}

 //we now calculate the final rating for each step by invoking the rateSelf for each of the hardware consumption instances in the sequencer ratings per step
 for (let x in sequencer_consumption) {
    //we enter each step
    for (let y in sequencer_consumption[x]) {
        let instance = sequencer_consumption[x][y];
        instance.selfRateHcs();
        instance.selfRateScs();
        instance.selfRateBcs(instance);
        instance.selfOCS();
    }

}
console.log("ALGO SEQUENCER CONSUMPTION: "+JSON.stringify(sequencer_consumption));


let step_ratings = [];//the average rating for each step, we take the mean from the instance's OcS

for (let x in sequencer_consumption) {
    //we enter each step
    let avg_rating = 0;
    let sum = 0;
    for (let y in sequencer_consumption[x]) {
        let instance = sequencer_consumption[x][y];
        sum += instance.Ocs;
    }
    avg_rating = sum / sequencer_consumption[x].length;


    //now that we have he average rating we have to check the variance: 
    let variance_top = 0;
    for (let y in sequencer_consumption[x]) {
        let instance = sequencer_consumption[x][y];
        let ocs = instance.Ocs;
        
        variance_top += Math.pow((ocs-avg_rating),2);
    }
    let variance = variance_top/ sequencer_consumption[x].length;

    let step_deviation = Math.sqrt(variance);
    console.log("Step CS data: \n"+"\n    Step variance: "+variance+"\n   Step deviation: "+step_deviation);
    let highest_Ocs = 0;
    let ocs=0;
    if(step_deviation>10){
        for (let y in sequencer_consumption[x]) {
            let instance = sequencer_consumption[x][y];
             ocs = instance.Ocs;
            console.log("Comparing "+ocs+"against: "+highest_Ocs);
            if(highest_Ocs<ocs){
                highest_Ocs = ocs;
                
            }
        }
        console.log("Step rating (highest OCS): "+highest_Ocs);
        step_ratings.push(highest_Ocs);
    }else{
        step_ratings.push(avg_rating);
        console.log("Step rating (average OCS): "+avg_rating);
    }

    
}

console.log("Step ratings: " + JSON.stringify(step_ratings));

for (let x in sequencer) {//here x is the step
    timing_diagram += sequencer[x].description;
}

//we add the rating background color to the timing diagram
let background_descriptions = '';

//THE COLORS ARE TAKEN FROM WIKIPEDIA: https://en.wikipedia.org/wiki/European_Union_energy_label (washing machines)
timing_diagram += '\n';

for (let x in step_ratings) {

    //we set the color selection
    console.log("Labeling score: " + step_ratings[x]);
    let label = getCategoryAccordingToTaxonomy(step_ratings[x]);
    background_descriptions += 'highlight ' + (Number(x) + 1) + ' to ' + (Number(x) + 2) + ' ' + label.color + ' : ' + label.label + '\n';

}

timing_diagram += background_descriptions;

//we store the highest and the lowest scores in the profie data so that we can use them later
    let highest = 0;
    for (let x in sequencer_consumption) {
        
        for (let y in sequencer_consumption[x]) {
            let instance = sequencer_consumption[x][y];
            if(instance.Ocs > highest){
                highest = instance.Ocs;
            }
        }
        
    }

    let lowest = 100;
    for (let x in sequencer_consumption) {
        
        for (let y in sequencer_consumption[x]) {
            let instance = sequencer_consumption[x][y];
            if(instance.Ocs < lowest){
                lowest = instance.Ocs;
            }
        }
        
    }

    let db_profile_index = findProfilePlaceInStorage('profile',this.element_to_edit.element_id);
    if(this.db.profile_Array[db_profile_index].hasOwnProperty("lowest_cs")){
        this.db.profile_Array[db_profile_index].lowest_cs = lowest;
        this.db.profile_Array[db_profile_index].highest_cs = highest;
    }else{
        this.db.profile_Array[db_profile_index]["lowest_cs"] = lowest;
        this.db.profile_Array[db_profile_index]["highest_cs"] = highest;
    }
}




function rateStep(step, step_index, hardwareGuideline) {
    console.log("%c rateStep: rating step: " + step_index, 'background-color: white;color:blue');
    let newConsumption;

    let step_consumption = [];
    //------------by state operations---------
    for (let x in step.by_state) {
        if (step.by_state[x] != null) {
            newConsumption = new HardwareConsumption();
            Object.assign(newConsumption, hardwareGuideline);
            
            let consumption = getRelativeConsumption(step.by_state[x], newConsumption);
            //we assign to the operation its consumption value..
            findInstanceInStorage(findPlaceByParentName('Operations', this.available_parents), step.by_state[x])['last_HCS'] = consumption;

            step_consumption.push(consumption);
        }
    }
    //------------by parameter operations-----

    for (let x in step.by_parameter) {
        if (step.by_parameter[x] != null) {
            newConsumption = new HardwareConsumption();
            Object.assign(newConsumption, hardwareGuideline);
            let consumption = getRelativeConsumption(step.by_parameter[x], newConsumption);
            //we assign to the operation its consumption value..
            findInstanceInStorage(findPlaceByParentName('Operations', this.available_parents), step.by_parameter[x])['last_HCS'] = consumption;

            step_consumption.push(consumption);
        }
    }
    //------------by operation----------------

    for (let x in step.by_operations) {
        if (step.by_operations[x] != null) {
            newConsumption = new HardwareConsumption();
            Object.assign(newConsumption, hardwareGuideline);
            let consumption = getRelativeConsumption(step.by_operations[x], newConsumption);
            //we assign to the operation its consumption value..
            findInstanceInStorage(findPlaceByParentName('Operations', this.available_parents), step.by_operations[x])['last_HCS'] = consumption;

            step_consumption.push(consumption);
        }
    }

    //console.log("Step " + x + " consumption data: " + JSON.stringify(step_consumption));

    return step_consumption;


    function getRelativeConsumption(operation_id, newConsumption) {
        console.log("%cgetRelativeConsumption: fetching the relative consumption for: " + operation_id, 'background-color:white;color:red');
        let profile = this.available_parents;
        let consumption_guide_index = findProfilePlaceInStorage('profile', this.element_to_edit.consumption_guide);
        let consumption_guide_unparsed = db.profile_Array[consumption_guide_index];
        let consumption_guide_parsed = JSON.parse(db.profile_Array[consumption_guide_index].profile_cache);
        let software_category = profile[0][1].software_category;
        let software_type = profile[0][1].software_type;
        let hardware_platform = profile[0][1].hardware_platform;
        let operation_instance = findInstanceInStorage(findPlaceByParentName('Operations', profile), operation_id);
        let proportion = 3;
        //-----------CPU RELATIVE CONSUMPTION-------------
        //1 is the index of the resource usage

        let qualitative_value = operation_instance.inner_variables[1].variables.CPU_usage;
        let quantitative_value;

        newConsumption.Cc = getValueByConsumptionGuide(operation_id, software_category, software_type, hardware_platform, qualitative_value, 'CPU_usage');
        if (qualitative_value == 'low') {
            newConsumption.Cc = newConsumption.Cc / proportion;
        } else if (qualitative_value == 'medium') {
            newConsumption.Cc = (newConsumption.Cc / proportion) * 2;
        }

        //-------------RAM RELATIVE CONSUMPTION-----------

        qualitative_value = operation_instance.inner_variables[1].variables.RAM_usage;
        quantitative_value = '';

        newConsumption.Rc = getValueByConsumptionGuide(operation_id, software_category, software_type, hardware_platform, qualitative_value, 'RAM_usage');
        if (qualitative_value == 'low') {
            newConsumption.Rc = newConsumption.Rc / proportion;
        } else if (qualitative_value == 'medium') {
            newConsumption.Rc = (newConsumption.Rc / proportion) * 2;
        }

        //---------------Storage Relative consumption------------ 

        qualitative_value = operation_instance.inner_variables[1].variables.storage_usage;
        quantitative_value = '';


        newConsumption.Sc = getValueByConsumptionGuide(operation_id, software_category, software_type, hardware_platform, qualitative_value, 'storage_usage');
        if (qualitative_value == 'low') {
            newConsumption.Sc = newConsumption.Sc / proportion;
        } else if (qualitative_value == 'medium') {
            newConsumption.Sc = (newConsumption.Sc / proportion) * 2;
        }
        //---------------Network Relative consumption------------ 

        qualitative_value = operation_instance.inner_variables[1].variables.network_usage;
        quantitative_value = '';

        relative_consumption = '';


        newConsumption.Nc = getValueByConsumptionGuide(operation_id, software_category, software_type, hardware_platform, qualitative_value, 'network_usage');
        if (qualitative_value == 'low') {
            newConsumption.Nc = newConsumption.Nc / proportion;
        } else if (qualitative_value == 'medium') {
            newConsumption.Nc = (newConsumption.Nc / proportion) * 2;
        }

        //------We get the rest of the sensors---------
        newConsumption.GPS = operation_instance.inner_variables[1].variables.GPS;
        newConsumption.Bluetooth = operation_instance.inner_variables[1].variables.Bluetooth;
        newConsumption.Camera = operation_instance.inner_variables[1].variables.Camera;
        newConsumption.Screen_brightness = operation_instance.inner_variables[1].variables.Screen_brightness;
        newConsumption.WIFI_usage = operation_instance.inner_variables[1].variables.WIFI_usage;
        //------WE GET THE VALUES FOR THE BBCP PROPERTIES OF THE OPERATIONS--------
        newConsumption.operation_data_handling = operation_instance.inner_variables[0].variables.operation_data_handling;
        newConsumption.operation_depth = operation_instance.inner_variables[0].variables.operation_depth;
        newConsumption.operation_task_distribution = operation_instance.inner_variables[0].variables.operation_task_distribution;
        
        //we return the object with all the data for the operation
        return newConsumption;

    }

    function getValueByConsumptionGuide(operation_id, software_category, software_type, hardware_platform, qualitative_value, hardware_component) {

        let consumption_guide_index = findProfilePlaceInStorage('profile', this.element_to_edit.consumption_guide);
        let consumption_guide_unparsed = db.profile_Array[consumption_guide_index];
        let consumption_guide_parsed = JSON.parse(db.profile_Array[consumption_guide_index].profile_cache);
        let quantitative_value;
        if(qualitative_value==''){
            return 0;
        }
        if (typeof qualitative_value == "string" || typeof qualitative_value == null) {
            //we get the quantitative value from the consumption guide
            //console.log("getRelativeConsumtion: The stored value is qualitative, converting to quantitative");
            //1- get the valid consumption guide according to the software category, the software type and the hardware platform
            if (software_type == '') {
                //there is no software type selection, therefore we have to look in the parent category
                //3 is the 'consumption' parent for the category, 4 is the instances
                let consumption_guide_instances = consumption_guide_parsed[3][4];
                let selected_consumption_guide_index;
                for (let x in consumption_guide_instances) {
                    if (consumption_guide_instances[x].parent_instance_id == software_category && consumption_guide_instances[x].inner_id == hardware_platform) {
                        selected_consumption_guide_index = consumption_guide_instances[x];
                    }
                }

                //now that we have the index of the consumption, we have to match the operation hardware consumption values to the values of the index
                let matrix_name = findInCoreHardwareComponentMatrix(hardware_component);

                let inner_variables = selected_consumption_guide_index.inner_variables

                //we fetch the object in the inner variables that matches the matrix_name
                let inner_variables_index = '';
                for (let x in inner_variables) {
                    if (inner_variables[x].name == matrix_name) {
                        inner_variables_index = x;
                        break;
                    }

                }

                return inner_variables[inner_variables_index].variables[qualitative_value];

            } else {
                //there is a selection of a software type, therefore the consumption comes from that sub-category
                  //there is no software type selection, therefore we have to look in the parent category
                //9 is the 'consumption' parent for the software type, 4 is the instances
                let consumption_guide_instances = consumption_guide_parsed[9][4];
                let selected_consumption_guide_index;
                for (let x in consumption_guide_instances) {
                    if (consumption_guide_instances[x].parent_instance_id == software_type && consumption_guide_instances[x].inner_id == hardware_platform) {
                        selected_consumption_guide_index = consumption_guide_instances[x];
                    }
                }

                //now that we have the index of the consumption, we have to match the operation hardware consumption values to the values of the index
                let matrix_name = findInCoreHardwareComponentMatrix(hardware_component);

                let inner_variables = selected_consumption_guide_index.inner_variables

                //we fetch the object in the inner variables that matches the matrix_name
                let inner_variables_index = '';
                for (let x in inner_variables) {
                    if (inner_variables[x].name == matrix_name) {
                        inner_variables_index = x;
                        break;
                    }

                }

                return inner_variables[inner_variables_index].variables[qualitative_value];
    


            }


        } else {
            //the value is not a string, it is set to a number, probably by an advanced user
            console.log("%cgetRelativeConsumption: The stored value is already quantiative", 'color:red;');
            quantitative_value = qualitative_value;
            return quantitative_value;
        }
    }

    function findInCoreHardwareComponentMatrix(profile_component_name) {

        for (let x in core_hardware_consumption_matrix) {
            //console.log("checking "+profile_component_name+' against '+core_hardware_consumption_matrix[x][0]);
            if (core_hardware_consumption_matrix[x][0] == profile_component_name) {
                let matrix_equivalence_name = core_hardware_consumption_matrix[x][1];
                //console.log("Returning name equivalence: "+matrix_equivalence);
                //we now have to get the correct object within inner_variables
                return matrix_equivalence_name;
            }
        }

        return profile_component_name;


    }

}


function getProfileOperationalPathways(profile, sequencer, step) {
    //console.log("%cgetOperationalPathways: PROFILE " + JSON.stringify(profile), "background-color: white;color:red;");
    console.log("%cgetOperationalPathways: step " + step, "background-color: white;color:red;");
    //We have to get the consumption from the operations.
    //I have to create a new attribute for the operatins called "weight". Weight will determine
    //how much actual consumption each one of the operations represents. Right now, I will not add
    //this property, instead I will assign consupmtion the following way: Low: 1/3 of the consumption, Medium: 2/3 high 3/3
    //there is still an issue as not all operations are used at the same time. Therefore, I need to find
    //the available operational sequences using triggers, results, operations and profile states

    //Priority: 1- profile state, 2- operations and results, Operations
    //I will handle all of this by using steps.

    //1- we get the operations that get triggered by the profile state
    if (step == 0) {
        let new_step = new Step();
        let triggers_index = findPlaceByParentName('Triggers', profile);
        //alert("Available triggers: "+JSON.stringify(profile[triggers_index][4]));
        //------TRIGGERED BY STATE------
        for (let x in profile[triggers_index][4]) {
            if (profile[triggers_index][4][x].inner_variables[0].variables.trigger_Type == "state" && profile[triggers_index][4][x].inner_variables[0].variables.trigger_value == "run") {
                //alert("Operation "+profile[triggers_index][4][x].inner_variables[0].variables.operation_id+" triggered by state");
                //console.log("%cOperation triggered by run: "+profile[triggers_index][4][x].inner_variables[0].variables.operation_id,'background-color:white;color:blue;');
                new_step.description += '\n@' + (step + 1) + '\n' + findInstanceInStorage(findPlaceByParentName('Operations', this.available_parents), profile[triggers_index][4][x].inner_variables[0].variables.operation_id).Name.split(' ').join('') + ' is On';
                new_step.by_state.push(profile[triggers_index][4][x].inner_variables[0].variables.operation_id);
                new_step.description += '\n@' + (step + 2) + '\n' + findInstanceInStorage(findPlaceByParentName('Operations', this.available_parents), profile[triggers_index][4][x].inner_variables[0].variables.operation_id).Name.split(' ').join('') + ' is Off';

            }
        }



        //operations triggered by an operation get triggered instantly by it in the same step
        //operations triggered by a parameter get triggered in the next step to the one where the parameter is generated

        //find the operations triggered by any operation up until now
        //----------TRIGGERED BY OPERATIONS-------
        /*  for(let x in new_step.by_state){
             //we match the operations that get triggered by the operation in x, using triggers of course
             let triggers = profile[findPlaceByParentName('Triggers',profile)][4];
             for(let y in triggers){
                 let operation_id = triggers[y].inner_variables[0].variables.operation_id;
                 let target_operation = triggers[y].inner_variables[0].variables.trigger_value;
                 let trigger_type = triggers[y].inner_variables[0].variables.trigger_Type;
     
                 //console.log("Operation by_state: "+step.by_state[x]+" Operation id:"+operation_id+" trigger_type: "+trigger_type+" target_operation: "+target_operation );
     
                 if(operation_id == new_step.by_state[x] && trigger_type == 'operation'){
                     console.log("%cOperation triggered by other operation(s): "+target_operation,'background-color:white;color:blue;' );
                     new_step.by_operations.push(target_operation);
                 }
             }
         }
      */
        getOperationsCascade(new_step.by_state, profile, new_step.by_operations);

        //we get the by_operations timing
        for (let x in new_step.by_operations) {
            let operation_id = new_step.by_operations[x];
            let operation_name = findInstanceInStorage(findPlaceByParentName('Operations', profile), operation_id).Name;
            let operation_pseudonim = operation_name.split(' ').join('');
            new_step.description += '\n' + '@' + (step + 1) + '\n' + operation_pseudonim + ' is On';
            new_step.description += '\n' + '@' + (step + 2) + '\n' + operation_pseudonim + ' is Off';
        }

        //now that we have the operations triggered by the state and by other operations, we need to get the results they generate
        //--------------RESULTS---------------
        let results_index = findPlaceByParentName('Results', profile);
        for (let x in new_step.by_state) {
            for (let y in profile[results_index][4]) {
                let parameter_instance = profile[results_index][4][y].inner_variables[0].variables.parameter;
                let parameter_name = findInstanceInStorage(findPlaceByParentName('Parameters', this.available_parents), parameter_instance);
                if (profile[results_index][4][y].inner_variables[0].variables.source_operation == new_step.by_state[x]) {
                    //console.log("%cResult: "+parameter_instance+" created by: "+new_step.by_state[x],"background-color:white;color:blue;");
                    new_step.results_generated.push(profile[results_index][4][y].inner_variables[0].variables.parameter);

                }
            }
        }
        for (let x in new_step.by_operations) {
            for (let y in profile[results_index][4]) {

                if (profile[results_index][4][y].inner_variables[0].variables.source_operation == new_step.by_operations[x]) {
                    //console.log("%cResult: "+profile[results_index][4][y].inner_variables[0].variables.parameter+" created by: "+new_step.by_operations[x],"background-color:white;color:blue;");
                    new_step.results_generated.push(profile[results_index][4][y].inner_variables[0].variables.parameter);
                }
            }
        }

        sequencer[step] = new_step;
        step += 1;
        getProfileOperationalPathways(profile, sequencer, step);

    } else {
        //****************** STEP>0 ****************

        //we are not in step 0, we gotta set our references to step-1
        let new_step = new Step();

        let previous_step = sequencer[(step - 1)];
        let triggers_index = findPlaceByParentName('Triggers', profile);
        //we first get the operations triggered by previous results

        //------------TRIGGERED BY RESULTS----------

        for (let x in previous_step.results_generated) {
            //we match the operations that get triggered by the operation in x, using triggers of course
            let triggers = profile[findPlaceByParentName('Triggers', profile)][4];
            for (let y in triggers) {
                let operation_to_trigger = triggers[y].inner_variables[0].variables.operation_id;
                let parameter = triggers[y].inner_variables[0].variables.trigger_value;
                let trigger_type = triggers[y].inner_variables[0].variables.trigger_Type;

                //console.log("Operation by_state: "+step.by_state[x]+" Operation id:"+operation_id+" trigger_type: "+trigger_type+" target_operation: "+target_operation );

                if (parameter == previous_step.results_generated[x] && trigger_type == 'parameter') {
                    //console.log("%cOperation triggered by previous parameters: "+operation_to_trigger,'background-color:white;color:blue;' );
                    new_step.by_parameter.push(operation_to_trigger);
                    let operation_name = findInstanceInStorage(findPlaceByParentName('Operations', profile), operation_to_trigger).Name;
                    let operation_pseudonim = operation_name.split(' ').join('');

                    new_step.description += '\n@' + (step + 1);
                    new_step.description += '\n' + operation_pseudonim + ' is On';
                    new_step.description += '\n@' + (step + 2);
                    new_step.description += '\n' + operation_pseudonim + ' is Off';
                }
            }

        }

        //--------TRIGGERED BY OPERATIONS--------
        getOperationsCascade(new_step.by_parameter, profile, new_step.by_operations);
        for (let x in new_step.by_operations) {
            let operation_name = findInstanceInStorage(findPlaceByParentName('Operations', profile), new_step.by_operations[x]).Name;
            let operation_pseudonim = operation_name.split(' ').join('');

            new_step.description += '\n@' + (step + 1);
            new_step.description += '\n' + operation_pseudonim + ' is On';
            new_step.description += '\n@' + (step + 2);
            new_step.description += '\n' + operation_pseudonim + ' is Off';
        }
        //---------RESULTS---------
        let results_index = findPlaceByParentName('Results', profile);
        for (let x in new_step.by_parameter) {
            for (let y in profile[results_index][4]) {

                if (profile[results_index][4][y].inner_variables[0].variables.source_operation == new_step.by_parameter[x]) {
                    //console.log("%cResult: "+profile[results_index][4][y].inner_variables[0].variables.parameter+" created by: "+new_step.by_parameter[x],"background-color:white;color:blue;");
                    new_step.results_generated.push(profile[results_index][4][y].inner_variables[0].variables.parameter);
                }
            }
        }
        for (let x in new_step.by_operations) {
            for (let y in profile[results_index][4]) {

                if (profile[results_index][4][y].inner_variables[0].variables.source_operation == new_step.by_operations[x]) {
                    console.log("%cResult: " + profile[results_index][4][y].inner_variables[0].variables.parameter + " created by: " + new_step.by_operations[x], "background-color:white;color:blue;");
                    new_step.results_generated.push(profile[results_index][4][y].inner_variables[0].variables.parameter);
                }
            }
        }

        if (new_step.by_operations == '' && new_step.by_parameter == '') {
            return;
        } else {
            sequencer[step] = new_step;
            step += 1;
            getProfileOperationalPathways(profile, sequencer, step);
        }


    }
}

function getOperationsCascade(startOperations, profile, rootCascade) {
    let cascade = [];
    let triggers_index = profile[findPlaceByParentName('Triggers', profile)][4];
    //we gotta check the operations triggered by the start operations and the subsequent operations
    //console.log("START OPERATIONS: "+startOperations);
    for (let x in startOperations) {
        for (let y in triggers_index) {
            let trigger_data = triggers_index[y].inner_variables[0].variables;
            let trigger_origin = trigger_data.operation_id;
            let trigger_target = trigger_data.trigger_value;
            let trigger_Type = trigger_data.trigger_Type;
            //console.log("%cgetOperationsCascade: does operation "+startOperations[x]+" trigger "+trigger_target+"? ",'background-color:white;color:red;');
            if (startOperations[x] == trigger_origin && trigger_Type == 'operation') {
                //console.log("%cYES",'color:green');
                rootCascade.push(trigger_target);
                cascade.push(trigger_target);
            }//else{
            //console.log("%cNO",'color:red');
            //}

        }
    }

    if (cascade.length == 0) {
        return;
    } else {
        getOperationsCascade(cascade, profile, rootCascade);
    }
}

function getCategoryAccordingToTaxonomy(score) {
    let label = '';
    let color = '';
    if (score < 20) {
        label = 'A';
    } else if (score >= 20 && score < 30) {
        label = 'B';
    } else if (score >= 30 && score < 40) {
        label = 'C';
    } else if (score >= 40 && score < 50) {
        label = 'D';
    } else if (score >= 50 && score < 60) {
        label = 'E';
    } else if (score >= 60 && score < 70) {
        label = 'F';
    } else if (score >=70) {
        label = 'G';
    }

    if (label == 'A') {
        color = '#33a357';
    }
    if (label == 'B') {
        color = '#79b752';
    }
    if (label == 'C') {
        color = '#c3d545';
    }
    if (label == 'D') {
        color = '#fff12c';
    }
    if (label == 'E') {
        color = '#edb731';
    }
    if (label == 'F') {
        color = '#d66f2c';
    }
    if (label == 'G') {
        color = '#cc232a';
    }

    let final_label = new Object();
    final_label.label = label;
    final_label.color = color;
    return final_label;
}


//lets open the general traits..
var report = [];

function showReport() {

    if (document.getElementById('temporal_report_modal')) {
        let a = document.getElementById('temporal_report_modal');
        a.remove();
    }

    let report_modal = '<div id="temporal_report_modal" class="modal" tabindex="-1" role="dialog"> <div class="modal-dialog" role="document"> <div class="modal-content"> <div class="modal-header"> <h5 class="modal-title">Energy rating report</h5> <button type="button" class="close" data-dismiss="modal" aria-label="Close" onclick="$(' + "'" + '#temporal_report_modal' + "'" + ').modal(' + "'" + 'toggle' + "'" + ');"> <span aria-hidden="true">&times;</span> </button> </div> <div id="report_modal_content"class="modal-body"> </div> <div class="modal-footer"> <button type="button" class="btn btn-secondary" data-dismiss="modal">Close</button> </div> </div> </div> </div>';
    //id of the modal: temporal_report_modal
    //id for appending the content: report_modal_content
    document.body.innerHTML += report_modal;
    let modal_content = document.getElementById('report_modal_content');
    //we append the report data to the modal
    for (let x in report) {
        modal_content.innerHTML += '<br><br>' + report[x];
    }

    $('#temporal_report_modal').modal('toggle');

}



initTimingDiagram();
//-------Generate the ratings-------------
//we get the Ocs for each operation in a step: 
fetchProfileBcs(this.available_parents);
getAlgoComponents();
//let taxonomic_label = getCategoryAccordingToTaxonomy(taxonomic_rating);

//-------Generate the timing diagram-------
timing_diagram += '';
db.timing_diagram = timing_diagram;
updateLocalStorage();
reasonerPlantumlDiagram();

console.log(report_highlights);
//----- Guide the user to new things in the UI -------
document.getElementById('_'+findPlaceByParentName('Operations',this.available_parents)+'_parent_header').parentElement.classList.add('attention');
//window.open('./timing_preview.html');
