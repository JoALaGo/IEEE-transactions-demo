
class Step {
    constructor() {
        this.by_state = [];
        this.by_operations = [];
        this.by_parameter = [];
        this.results_generated = [];
        this.description = '';
    }
}



function getProfileOperationalPathways(profile, sequencer, step) {
    //Profile is the profile to get the operational pathways of, SEQUENCER is the array where we will store the sequences, step is just the initial step
    //console.log("%cgetOperationalPathways: step " + step, "background-color: white;color:red;");
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
        if(triggers_index == null){
            alertify.error('(er3) The profile: can not be executed because it does not seem to be a BBCP.');
            return;
        }
        //------TRIGGERED BY STATE------
        for (let x in profile[triggers_index][4]) {
            if (profile[triggers_index][4][x].inner_variables[0].variables.trigger_Type == "state" && profile[triggers_index][4][x].inner_variables[0].variables.trigger_value == "run") {

                //console.log("%cOperation triggered by run: "+profile[triggers_index][4][x].inner_variables[0].variables.operation_id,'background-color:white;color:blue;');
                new_step.description += '\n@' + (step + 1) + '\n' + findInstanceInProfile(findPlaceByParentName('Operations', profile), profile[triggers_index][4][x].inner_variables[0].variables.operation_id,profile).Name.split(' ').join('') + ' is On';
                new_step.by_state.push(profile[triggers_index][4][x].inner_variables[0].variables.operation_id);

                new_step.description += '\n@' + (step + 2) + '\n' + findInstanceInProfile(findPlaceByParentName('Operations', profile), profile[triggers_index][4][x].inner_variables[0].variables.operation_id,profile).Name.split(' ').join('') + ' is Off';

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
            let operation_name = findInstanceInProfile(findPlaceByParentName('Operations', profile), operation_id,profile).Name;
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
                let parameter_name = findInstanceInProfile(findPlaceByParentName('Parameters', profile), parameter_instance,profile);
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
                    let operation_name = findInstanceInProfile(findPlaceByParentName('Operations', profile), operation_to_trigger,profile).Name;
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
            let operation_name = findInstanceInProfile(findPlaceByParentName('Operations', profile), new_step.by_operations[x],profile).Name;
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

// Function to execute the BBCP profile
function execute_bbcp_profile(profile, simulation_duration) {
    const start_time = Date.now(); // Start time of the simulation
    let current_time = 0; // Current time in seconds
    let quota = profile.Usage.Run_constraints.quota; // Quota for accumulated run time
    let cooldown = profile.Usage.Run_constraints.cooldown; // Cooldown duration after quota is depleted
  
    while (current_time < simulation_duration) {
      var profile_state = get_profile_state(current_time, profile);
  
      if (profile_state === "run") {
        if (quota > 0) {
          // Profile is in run state and has quota remaining
          evaluate_profile(profile_state, current_time, profile);
          quota--;
        } else {
          // Profile has depleted quota, switch to stop state and wait for cooldown
          profile_state = "stop";
          evaluate_profile(profile_state, current_time, profile);
          cooldown = profile.Usage.Run_constraints.cooldown;
        }
      } else {
        // Profile is in stop state
        evaluate_profile(profile_state, current_time, profile);
        cooldown--;
        if (cooldown === 0) {
          // Cooldown is complete, reset quota and switch back to run state
          quota = profile.Usage.Run_constraints.quota;
          profile_state = "run";
        }
      }
  
      current_time = Math.floor((Date.now() - start_time) / 1000);
    }
  }
  
  // Function to determine the profile state based on the current time
  function get_profile_state(current_time, profile) {
    // Check if any timed expectation matches the current time
    for (const expectation of profile.Expectations.Cycles[0].Timed_expectations) {
      if (is_time_within_range(current_time, expectation.time_range)) {
        // Apply probability overrides and elasticity if available
        let run_probability = expectation.run_probability_override || profile.Usage.Run_constraints.default_run_probability;
        let stop_probability = expectation.stop_probability_override || profile.Usage.Run_constraints.default_stop_probability;
  
        if (expectation.Elasticity) {
          const elasticity = expectation.Elasticity;
          run_probability = apply_elasticity(run_probability, elasticity);
          stop_probability = apply_elasticity(stop_probability, elasticity);
        }
  
        // Generate a random number between 0 and 1
        const random_number = Math.random();
  
        // Check if the random number falls within the run probability range
        if (random_number <= run_probability) {
          return 'run';
        } else if (random_number > run_probability && random_number <= stop_probability) {
          return 'stop';
        } else {
          return 'stop';
        }
      }
    }
  
    const run_probability = profile.Usage.Run_constraints.default_run_probability;
    const stop_probability = profile.Usage.Run_constraints.default_stop_probability;
  
    const random_number = Math.random();
  
    if (random_number <= run_probability) {
      return 'run';
    } else if (random_number > run_probability && random_number <= stop_probability) {
      return 'stop';
    } else {
      return 'stop';
    }
  }
  
  // Function to apply elasticity to a probability value
  function apply_elasticity(probability, elasticity) {
    probability += elasticity.positive_run_probability_modifier - elasticity.negative_run_probability_modifier;
    probability = Math.max(elasticity.minimum_run_probability, Math.min(elasticity.maximum_run_probability, probability));
    return probability;
  }
  
  // Function to evaluate the profile at the current time
  
  function evaluate_profile(profile_state, current_time, profile) {
    // Perform additional evaluation or logging based on the profile state and current time
    // ...
  
    // Example: Log the profile state and current time
    console.log(`Profile state at time ${current_time}: ${profile_state}`);
  }
  
  // Function to check if the current time is within a given time range
  function is_time_within_range(current_time, time_range) {
    const [start_time, end_time] = time_range.split('-').map(Number);
    return current_time >= start_time && current_time <= end_time;
  }
  
  const profile = {
    Profile_configuration: {
      consumption_guide: "Day in the life of a working person",
      software_category: "Productivity",
      software_type: "Work-related tasks",
      hardware_platform: "Desktop",
      Computation_centric: {
        task_distribution: "Single-tasking",
        computational_criticality: "Medium",
        computation_complexity: "Moderate",
      },
      Data_centric: {
        data_flow_behavior: "Low",
        data_flow_direction: "Inward",
        data_handling: "Moderate",
      },
      Conduct_centric: {
        access_frequency: "Frequent",
        consumption_rate: "High",
        depth: "Shallow",
        dependence: "Low",
      },
    },
    Usage: {
      profile_evaluation_rate: "1 Hz",
      run_base_probability: 0.8,
      stop_base_probability: 0.2,
      Run_constraints: {
        minimum_run_time: "5 minutes",
        maximum_run_time: "1 hour",
        quota: "45 minutes",
        cooldown: "15 minutes",
      },
    },
    Expectations: {
      Cycles: [
        {
          Days: "Weekdays",
          Scale: "1 day",
          Timed_expectations: [
            {
              time_range: "9-12",
              evaluation_rate_override: "2 Hz",
              run_probability_override: 0.9,
              stop_probability_override: 0.1,
              Elasticity: {
                elasticity: true,
                minimum_run_probability: 0.7,
                maximum_run_probability: 0.95,
                minimum_stop_probability: 0.05,
                maximum_stop_probability: 0.3,
                positive_run_probability_modifier: 0.05,
                negative_run_probability_modifier: 0.03,
                positive_stop_probability_modifier: 0.02,
                negative_stop_probability_modifier: 0.01,
              },
              Run_constraints: {
                minimum_run_time: "15 minutes",
                maximum_run_time: "30 minutes",
                quota: "20 minutes",
                cooldown: "10 minutes",
              },
            },
            {
              time_range: "14-18",
              evaluation_rate_override: "3 Hz",
              run_probability_override: 0.85,
              stop_probability_override: 0.15,
              Elasticity: {
                elasticity: false,
              },
              Run_constraints: {
                minimum_run_time: "10 minutes",
                maximum_run_time: "45 minutes",
                quota: "30 minutes",
                cooldown: "5 minutes",
              },
            },
            {
              time_range: "20-22",
              evaluation_rate_override: "1 Hz",
              run_probability_override: 0.75,
              stop_probability_override: 0.25,
              Elasticity: {
                elasticity: true,
                minimum_run_probability: 0.6,
                maximum_run_probability: 0.8,
                minimum_stop_probability: 0.2,
                maximum_stop_probability: 0.4,
                positive_run_probability_modifier: 0.03,
                negative_run_probability_modifier: 0.02,
                positive_stop_probability_modifier: 0.01,
                negative_stop_probability_modifier: 0.02,
              },
              Run_constraints: {
                minimum_run_time: "5 minutes",
                maximum_run_time: "15 minutes",
                quota: "10 minutes",
                cooldown: "10 minutes",
              },
            },
          ],
        },
      ],
      Events: [],
    },
    Operations: [
      {
        operation_ID: "operation1",
        operation_description: "Send emails",
              operation_data_handling: "Moderate",
        operation_task_distribution: "Sequential",
        operation_depth: "Shallow",
        resource_usage: {
          CPU_usage: "Medium",
          RAM_usage: "Low",
          storage_usage: "Low",
          network_usage: "Medium",
          Camera: false,
          Screen_brightness: "Low",
          GPS: false,
          Bluetooth: false,
          WIFI_usage: "Medium",
        },
        Operation_run_constraints: {
          minimum_run_time: "2 minutes",
          maximum_run_time: "10 minutes",
          quota: "8 minutes",
          cooldown: "2 minutes",
        },
      },
      {
        operation_ID: "operation2",
        operation_description: "Attend virtual meetings",
        operation_data_handling: "Moderate",
        operation_task_distribution: "Sequential",
        operation_depth: "Shallow",
        resource_usage: {
          CPU_usage: "High",
          RAM_usage: "Medium",
          storage_usage: "Low",
          network_usage: "High",
          Camera: true,
          Screen_brightness: "Medium",
          GPS: false,
          Bluetooth: false,
          WIFI_usage: "High",
        },
        Operation_run_constraints: {
          minimum_run_time: "5 minutes",
          maximum_run_time: "30 minutes",
          quota: "20 minutes",
          cooldown: "10 minutes",
        },
      },
      {
        operation_ID: "operation3",
        operation_description: "Document preparation",
        operation_data_handling: "Moderate",
        operation_task_distribution: "Sequential",
        operation_depth: "Shallow",
        resource_usage: {
          CPU_usage: "Medium",
          RAM_usage: "Medium",
          storage_usage: "Medium",
          network_usage: "Low",
          Camera: false,
          Screen_brightness: "Medium",
          GPS: false,
          Bluetooth: false,
          WIFI_usage: "Medium",
        },
        Operation_run_constraints: {
          minimum_run_time: "10 minutes",
          maximum_run_time: "45 minutes",
          quota: "30 minutes",
          cooldown: "5 minutes",
        },
      },
    ],
    Dependencies: {
      Operational: [
        {
          source_operation_id: "operation1",
          target_operation_ID: "operation2",
          operational_dependency_type: "Sequential",
        },
        {
          source_operation_id: "operation2",
          target_operation_ID: "operation3",
          operational_dependency_type: "Sequential",
        },
      ],
      Triggers: [
        {
          operation_id: "operation1",
          trigger_value: "run",
          trigger_Type: "State",
        },
        {
          operation_id: "operation2",
          trigger_value: "run",
          trigger_Type: "State",
        },
        {
          operation_id: "operation3",
          trigger_value: "run",
          trigger_Type: "State",
        },
      ],
      Results: [],
    },
    Parameters: [
      {
        parameter_ID: "parameter1",
        parameter_description: "Email content",
        direction: "Internal",
        size: "Small",
        origin: "Generated",
      },
      {
        parameter_ID: "parameter2",
        parameter_description: "Meeting agenda",
        direction: "Internal",
        size: "Medium",
        origin: "Generated",
      },
      {
        parameter_ID: "parameter3",
        parameter_description: "Document template",
        direction: "Internal",
        size: "Large",
        origin: "Generated",
      },
    ],
  };
  
  