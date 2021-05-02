let Draggable = require('react-draggable');

class App extends React.Component{
    constructor(props){
        super(props);

        this.state = {
            list: new Map(),
            patchCords: [],
            currentCordCount: 0,
            cumulativeCordCount: 0,
            outputMode: false,
            cordCombos: {},
            alert: false,
            pingText: "",
            audioContext: new AudioContext()
        }
        this.handleClick=this.handleClick.bind(this);
        this.handleClose=this.handleClose.bind(this);

        this.addCord=this.addCord.bind(this);
        this.handlePatchExit=this.handlePatchExit.bind(this);
        this.handleOutput=this.handleOutput.bind(this);
        this.deleteCord=this.deleteCord.bind(this);
        this.handleDrag=this.handleDrag.bind(this);
        this.handleComboDelete=this.handleComboDelete.bind(this);
        this.handlePingExit=this.handlePingExit.bind(this);
        this.myAlert=this.myAlert.bind(this);
    }

    //Passed to SideButtons to control which buttons are added to PlaySpace
    handleClick(childKey, childJSX, inputOnly){
        if(this.state.outputMode){
            this.handlePatchExit();
        }
        let newCombos = {...this.state.cordCombos, [childKey]: []};
        this.setState((state) => ({
            list: new Map([...state.list, [childKey, {myKey: childKey,
                                                    filling: childJSX,
                                                    name:childKey.split(" ")[0],
                                                    inputOnly: inputOnly}]]),
            cordCombos: newCombos
        }));
    };

    //Passed to Area to control which modules are removed from PlaySpace
    handleClose(childKey){
        let newMap = new Map(this.state.list);
        newMap.delete(childKey);

        //need to delete all patchcords attached to it, and disconnect all audio streams.
        let newCords = [...this.state.patchCords];
        let finCords = [...this.state.patchCords];
        let minCount = 0;
        let newCombos = {...this.state.cordCombos};
        newCords.forEach(el => {
            if(el.fromData.fromModID == childKey){
                let val = finCords.indexOf(el);
                finCords.splice(val, 1);
                minCount++;

                el.fromData.audio.disconnect(el.toData.audio);
                }
            if(el.toData.tomyKey == childKey || el.toData.tomyKey.split(' ')[0] + " " + el.toData.tomyKey.split(' ')[1] == childKey){
                let val = finCords.indexOf(el);
                finCords.splice(val, 1);
                minCount++;

                el.fromData.audio.disconnect(el.toData.audio);
                
                //make sure any output cords are removed from cordCombos
                newCombos[el.fromData.fromModID].splice(newCombos[el.fromData.fromModID].indexOf(childKey), 1);
            }
            })

        //delete property from cordCombos object    
        delete newCombos[childKey];


        this.setState(state => ({
            list: newMap,
            patchCords: finCords,
            currentCordCount: state.currentCordCount - minCount,
            cordCombos: newCombos
        }))
    }

    //click X to not make patch cord after input click
    handlePatchExit(){
        let newCords = [...this.state.patchCords];
        let popped = newCords.pop();
        this.setState(state => ({
            currentCordCount: state.currentCordCount - 1,
            cumulativeCordCount: state.cumulativeCordCount - 1,
            outputMode: false,
            patchCords: newCords
        }))
    }

    //add initial patch cord data upon input click
    addCord(info){
        this.setState((state) => ({
            patchCords: [...state.patchCords, {id: "cord" + this.state.cumulativeCordCount, fromData: info, toData: null}],
            currentCordCount: state.currentCordCount + 1,
            cumulativeCordCount: state.cumulativeCordCount + 1,
            outputMode: true
        }))
    }

    //add output data to fully formed patch cords
    handleOutput(info){
        if(this.state.outputMode){
            let newCords = [...this.state.patchCords];
            let toData = "toData";
            let lastEl = newCords[this.state.currentCordCount-1];
            let fromMod = lastEl.fromData.fromModID;
            if(fromMod == info.tomyKey){
                this.myAlert("You cannot plug a module into itself!");
                this.handlePatchExit();
            }else if(this.state.cordCombos[fromMod].includes(info.tomyKey)){
                this.myAlert("You've already patched this cable!");
                this.handlePatchExit();
            }else{
                lastEl[toData]=info;
                let newCombo = {...this.state.cordCombos};
                newCombo[fromMod].push(info.tomyKey);
                this.setState((state) => ({
                    patchCords: newCords,
                    cordCombos: newCombo
             }));

             this.setState({
                    outputMode: false
             })
            }
            //handle Audio
            lastEl.fromData.audio.connect(info.audio);
        }
    }

    
    deleteCord(cordID){
        let newArr = [...this.state.patchCords];
        for(let i = 0; i < newArr.length; i++){
            if(newArr[i].id == cordID){
                newArr[i].fromData.audio.disconnect(newArr[i].toData.audio);
                break;
            }
        }
        this.setState(state => ({
            patchCords: newArr.filter(el => {
                return el.id !== cordID;
            }),
            currentCordCount: state.currentCordCount - 1,
        }))
        this.handleComboDelete(cordID);
    }

    handleComboDelete(cordID){
        const cordVal = this.state.patchCords.find(val => val.id == cordID);
        let fromCombo = cordVal.fromData.fromModID;
        let newCombo = {...this.state.cordCombos};
        newCombo[fromCombo].splice(newCombo[fromCombo].indexOf(cordVal.toData.tomyKey), 1);
        this.setState({
            cordCombos: newCombo
        })
    }

    //redraw cords when module is dragged
    handleDrag(modID){
        let largerDim = window.innerHeight > window.innerWidth ? window.innerHeight : window.innerWidth;
        let newCords = [...this.state.patchCords];
        newCords.forEach(el => {
            if(el.toData.tomyKey.includes(" ")){
                console.log(el.toData.tomyKey);
            }
            if(el.fromData.fromModID == modID){ 
                let in_el = document.getElementById(modID + "outputInner").getBoundingClientRect();
                let in_x = in_el.x;
                let in_y = in_el.y;
                let in_bottom = in_el.bottom;
                let in_right = in_el.right;
                let in_xCenter = ((in_right - in_x) / 2 + in_x) - (largerDim * .04);
                let in_yCenter = ((in_bottom - in_y) / 2 + in_y) - (largerDim * .04);
                el.fromData.fromLocation = {x: in_xCenter, y: in_yCenter}
            }else if(el.toData.tomyKey == modID){
                let to_el = document.getElementById(modID + "inputInner").getBoundingClientRect();
                let to_x = to_el.x;
                let to_y = to_el.y;
                let to_bottom = to_el.bottom;
                let to_right = to_el.right;
                let to_xCenter = ((to_right - to_x) / 2 + to_x) - (largerDim * .04);
                let to_yCenter = ((to_bottom - to_y) / 2 + to_y) - (largerDim * .04);
                el.toData.toLocation = {x: to_xCenter, y: to_yCenter}
            }else if(el.toData.tomyKey.includes(" ") && el.toData.tomyKey.split(' ')[0] + " " + el.toData.tomyKey.split(' ')[1] == modID){
                let newStr = el.toData.tomyKey.split(' ')[2];
                console.log("I'M IN HERE: " + newStr);
                let to_el = document.getElementById(el.toData.tomyKey + " inputInner").getBoundingClientRect();
                let to_x = to_el.x;
                let to_y = to_el.y;
                let to_bottom = to_el.bottom;
                let to_right = to_el.right;
                let to_xCenter = ((to_right - to_x) / 2 + to_x) - (largerDim * .04);
                let to_yCenter = ((to_bottom - to_y) / 2 + to_y) - (largerDim * .04);
                el.toData.toLocation = {x: to_xCenter, y: to_yCenter}
            }
        })

        this.setState(state => ({
            patchCords: newCords
        }))
    }

    myAlert(ping){
        this.setState({
            alert: true,
            pingText: ping
        })
    }

    handlePingExit(){
        this.setState({
            alert: false,
            pingText: ""
        })
    }


    render(){
        const dragHandlers = {onStart: this.onStart, onStop: this.onStop};
        let cords = []; //loop through the cords in the state, add line version to this array
        let tempArr = [...this.state.patchCords];
        tempArr.forEach(el => {
            if(el['toData']){
                cords.push(<Cord deleteCord={this.deleteCord} key={el.id} id={el.id} x1={el.fromData.fromLocation.x} y1={el.fromData.fromLocation.y} x2={el.toData.toLocation.x} y2={el.toData.toLocation.y}></Cord>)
            }
        })
        return(
            <div id="mainDiv">
                <div id="logo"></div>
                <div id="header"></div>
                <div id="sidebar">
                    <SideButtons 
                                id="sideButtons" 
                                handleClick={this.handleClick}/> 
                </div>
                <div id="playSpace">
                    <svg id="patchCords">{cords}</svg>
                    <div className={this.state.alert ? "show pingBox" : "hide pingBox"}>
                        <div id="pingTextDiv">
                            <h3 className="error">Not so fast!</h3>
                        </div>
                        <p id="pingText">{this.state.pingText}</p>
                        <i 
                        id="pingExit" 
                        onClick={this.handlePingExit}
                        className="fa fa-times-circle"
                        aria-hidden="true"></i>
                    </div>
                    <i 
                        id="patchExit" 
                        onClick={this.handlePatchExit}
                        className={this.state.outputMode ? "show fa fa-times-circle" : "hide fa fa-times-circle"} 
                        aria-hidden="true"></i>

                {[...this.state.list].map(([key, {myKey, filling, name, inputOnly}]) => {
                        return <Draggable onDrag={() => {this.handleDrag(key)}} key={key} handle="p" {...dragHandlers} bounds="parent">
                                    <div className="dragDiv">
                                        <Area 
                                                        key={myKey} 
                                                        myKey={myKey}
                                                        filling={filling} 
                                                        name={name}
                                                        handleClose={this.handleClose}
                                                        outputMode={this.state.outputMode}
                                                        addPatch={this.addCord} 
                                                        handleOutput={this.handleOutput}
                                                        inputOnly={inputOnly}
                                                        audioContext={this.state.audioContext}
                                                        />
                                    </div></Draggable>
                    })}
                    <Output handleOutput={this.handleOutput}
                            audioContext={this.state.audioContext}
                    />
                </div>
            </div>
        )
    }
}


//Create a draggable module with filling that changes based on which button you press to create module.
class Area extends React.Component{
    constructor(props){
        super(props);

        this.state={
            audio: {}
        }

        this.handleClose=this.handleClose.bind(this);
        this.handleCreatePatch=this.handleCreatePatch.bind(this);
        this.handleOutput=this.handleOutput.bind(this);
        this.createAudio=this.createAudio.bind(this);
        this.renderFilling=this.renderFilling.bind(this);
    }


    //Close on press of X icon. Pass key up to App and remove from state.list
    handleClose(){
        this.props.handleClose(this.props.myKey);
    }

    //handle first click in input area
    handleCreatePatch(event){
        if(!this.props.outputMode){
            let largerDim = window.innerHeight > window.innerWidth ? window.innerHeight : window.innerWidth;
            let el = event.target.getBoundingClientRect();
            let x = el.x;
            let y = el.y;
            let bottom = el.bottom;
            let right = el.right;
            let xCenter = ((right - x) / 2 + x) - (largerDim * .04);
            let yCenter = ((bottom - y) / 2 + y) - (largerDim * .04);
            this.props.addPatch({fromModID: this.props.myKey,
                             fromLocation: {x: xCenter, y: yCenter},
                            audio: this.state.audio});
            }
    }

    //handle patchcord click in output area
    handleOutput(event){
        let largerDim = window.innerHeight > window.innerWidth ? window.innerHeight : window.innerWidth;
        let el = event.target.getBoundingClientRect();
        let x = el.x;
        let y = el.y;
        let bottom = el.bottom;
        let right = el.right;
        let xCenter = ((right - x) / 2 + x) - (largerDim * .04);
        let yCenter = ((bottom - y) / 2 + y) - (largerDim * .04);
        
        this.props.handleOutput({tomyKey: this.props.myKey,
                                 toLocation: {x: xCenter, y: yCenter},
                                audio: this.state.audio});
        }

    createAudio(childAudio){
        this.setState({
            audio: childAudio
        })
    }

    renderFilling(){
        switch(this.props.filling){
            case "Oscillator":
                return <Oscillator audioContext={this.props.audioContext} createAudio={this.createAudio}/>;
            case "Gain":
                return <Gain audioContext={this.props.audioContext} createAudio={this.createAudio} parent={this.props.myKey} handleOutput={this.props.handleOutput}/>
            case "Filter":
                return <Filter audioContext={this.props.audioContext} createAudio={this.createAudio}/>;
            default:
                return <div>Hahahahaha theres nothing here!</div>;
        }
    }


    render(){
        return(
                <div className="moduleDiv"
                    >

                    <p id="modTitle">
                        <i className="fa fa-times" aria-hidden="true" onClick={this.handleClose}></i>{
                        this.props.name}
                    </p>

                    {/*eventually will be unique module fillings*/}
                    <div id="innerModDiv">
                         {this.renderFilling()}
                    </div>

                    {/*input patch cords area*/}
                    <div className={this.props.outputMode ? "cordOuter hide" : "cordOuter show interactive"} 
                         id="outputOuter" onClick={this.handleCreatePatch}>
                            <div className="cordInner" id={this.props.myKey + "outputInner"}>
                            </div>
                    </div>
                    {/*output patch cords area*/}
                    
                    {
                        this.props.inputOnly == "false" &&
                        <div className={this.props.outputMode ? "cordOuter show raise interactive" : "cordOuter show"} 
                             id="inputOuter" onClick={this.handleOutput}>
                                 <div className="cordInner" id={this.props.myKey + "inputInner"}>
                                 </div>
                         </div>
                    }
                </div>
        )
    }
}

//Oscillator Module
class Oscillator extends React.Component{
    constructor(props){
        super(props);

        this.state={
            audio: this.props.audioContext.createOscillator(),
            wave: "sine",
            val: 220,
            num: 220,
            min: 20,
            max: 700,
            step: 1,
            LFO: false,
        }

        this.handleFreqChange=this.handleFreqChange.bind(this);
        this.handleWaveChange=this.handleWaveChange.bind(this);
        this.handleLFOClick=this.handleLFOClick.bind(this);
        this.handleNumChange=this.handleNumChange.bind(this);
        this.handleNumFreqChange=this.handleNumFreqChange.bind(this);
    }

    handleFreqChange(event){
        let freq = event.target.value;
        if(freq > this.state.max){
            freq=this.state.max;
        }else if(freq < this.state.min){
            freq=this.state.min;
        }
        this.state.audio.frequency.setValueAtTime(freq, this.props.audioContext.currentTime);
        this.setState({
            num: freq,
            val: freq
        })
    }

    handleWaveChange(wave){
        this.state.audio.type=wave;
        this.setState({
            wave: wave
        })
    }

    handleLFOClick(){
        if(this.state.LFO){
            this.setState({
                max: 700,
                val: 220,
                num: 220,
                min:20,
                step: 1,
                LFO: false
            })
            this.state.audio.frequency.setValueAtTime(220, this.props.audioContext.currentTime);
        }else{
            this.setState({
                val: 10,
                num: 10,
                max: 20,
                min: 0,
                step: .1,
                LFO: true
            })
            this.state.audio.frequency.setValueAtTime(10, this.props.audioContext.currentTime);
        }
    }

    handleNumChange(event){
        if(isNaN(event.target.value)){
            return;
        }
        this.setState({
            num: event.target.value
        })
    }

    handleNumFreqChange(){
        let temp = this.state.num;
        if(temp > this.state.max){
            temp=this.state.max
        }else if(temp < this.state.min){
            temp=this.state.min
        }
        this.setState({
            val: temp,
            num: temp
        })
        this.state.audio.frequency.setValueAtTime(temp, this.props.audioContext.currentTime);
    }

    componentDidMount(){
        this.props.createAudio(this.state.audio);
        this.state.audio.frequency.setValueAtTime(this.state.val, this.props.audioContext.currentTime);
        this.state.audio.start();
    }

    render(){
        return(
            <div className="oscDiv">
                <Selector id="waveSelector" values={["sine", "sawtooth", "triangle"]} handleClick={this.handleWaveChange} />
                <label id="oscSlider" className="switch tooltip">
                     <input type="checkbox" onClick={this.handleLFOClick}></input>
                     <span className="slider round"></span>
                     <span id="oscLFOTip" className="tooltiptext">LFO Mode</span>
                 </label>
                 <div className="tooltip">
                    <input type="range" value={this.state.val} min={this.state.min} max={this.state.max} step={this.state.step} onChange={this.handleFreqChange}></input>
                    <span id="oscFreqTip" className="tooltiptext">Freq</span>
                </div>
                <input id="freqNumInput" value={this.state.num} type="text" onChange={this.handleNumChange} onKeyPress={event => {if(event.key == "Enter"){this.handleNumFreqChange()}}}></input>
                </div>
        )
    }
}

class Gain extends React.Component{
    constructor(props){
        super(props);

        this.state={
            audio: this.props.audioContext.createGain(),
            value: .5,
            num: .5,
            max: 1,
            min: 0
        }

        this.handleGainChange=this.handleGainChange.bind(this);
        this.handleNumChange=this.handleNumChange.bind(this);
        this.handleNumGainChange=this.handleNumGainChange.bind(this);
        this.handleOutput=this.handleOutput.bind(this);
    }

    handleGainChange(event){
        let gainVal = event.target.value;
        if(gainVal > 1){
            gainVal=1;
        }else if(gainVal < 0){
            gainVal=0;
        }
        this.state.audio.gain.setValueAtTime(gainVal, this.props.audioContext.currentTime);
        this.setState({
            value: gainVal,
            num: gainVal
        });
    }

    handleNumChange(event){
        if(isNaN(event.target.value)){
            return;
        }
        this.setState({
            num: event.target.value
        })
    }

    handleNumGainChange(){
        let temp = this.state.num;
        if(temp > this.state.max){
            temp=this.state.max
        }else if(temp < this.state.min){
            temp=this.state.min
        }
        this.setState({
            value: temp,
            num: temp
        })
    }

    handleOutput(event){
        let largerDim = window.innerHeight > window.innerWidth ? window.innerHeight : window.innerWidth;
        let el = event.target.getBoundingClientRect();
        let x = el.x;
        let y = el.y;
        let bottom = el.bottom;
        let right = el.right;
        let xCenter = ((right - x) / 2 + x) - (largerDim * .04);
        let yCenter = ((bottom - y) / 2 + y) - (largerDim * .04);
        
        this.props.handleOutput({tomyKey: this.props.parent+ " param",
                                 toLocation: {x: xCenter, y: yCenter},
                                audio: this.state.audio.gain});
        }

    componentDidMount(){
        this.props.createAudio(this.state.audio);
        this.state.audio.gain.setValueAtTime(.5, this.props.audioContext.currentTime);
    }

    render(){
        return(
            <div className="gainDiv">
                <input id="gainRangeInput" type="range" value={this.state.value} min="0" max="1" step=".05" onChange={this.handleGainChange}></input>
                <input id="gainNumInput" value={this.state.num} type="text" onChange={this.handleNumChange} onKeyPress={event => {if(event.key == "Enter"){this.handleNumGainChange()}}}></input>

                <div className="cordOuter tooltip" id="firstParam" onClick={this.handleOutput}>
                    <div className="cordInner" id={this.props.parent + " param" + " inputInner"}>
                    <span id="gainGainParamTip" className="tooltiptext"><span className="paramSpan">param: </span>Gain</span>
                    </div>
                </div>
            </div>
        )
    }
}

class Filter extends React.Component{
    constructor(props){
        super(props);

        this.state={
            audio: this.props.audioContext.createBiquadFilter(),
            type: "lowpass",
            gainNum: .5,
            gainVal: .5,
            gainMax: 1,
            gainMin: 0,
            freqNum: 440,
            freqVal: 440,
            freqMax: 3000,
            freqMin: 0

        }

        this.handleFilterType=this.handleFilterType.bind(this);
        this.handleGainRangeChange=this.handleGainRangeChange.bind(this);
        this.handleGainNumChange=this.handleGainNumChange.bind(this);
        this.handleGainNumSubmit=this.handleGainNumSubmit.bind(this);
        this.handleFreqRangeChange=this.handleFreqRangeChange.bind(this);
        this.handleFreqNumChange=this.handleFreqNumChange.bind(this);
        this.handleFreqNumSubmit=this.handleFreqNumSubmit.bind(this);
    }

    handleFilterType(val){
        this.state.audio.type = val;
        this.setState({
            type: val
        })
    }

    handleGainRangeChange(event){
        let gainVal = event.target.value;
        if(gainVal > this.state.gainMax){
            gainVal=this.state.gainMax;
        }else if(gainVal < this.state.gainMin){
            gainVal=this.state.gainMin;
        }
        this.state.audio.gain.setValueAtTime(gainVal, this.props.audioContext.currentTime);
        this.setState({
            gainVal: gainVal,
            gainNum: gainVal
        });
    }

    handleGainNumChange(event){
        if(isNaN(event.target.value)){
            return;
        }
        this.setState({
            gainNum: event.target.value
        })
    }

    handleGainNumSubmit(){
        let temp = this.state.gainNum;
        if(temp > this.state.gainMax){
            temp=this.state.gainMax;
        }else if(temp < this.state.gainMin){
            temp=this.state.gainMin
        }
        this.setState({
            gainVal: temp,
            gainNum: temp
        })
    }

    handleFreqRangeChange(event){
        let freqVal = event.target.value;
        if(freqVal > this.state.freqMax){
            freqVal=this.state.freqMax;
        }else if(freqVal < this.state.freqMin){
            freqVal=this.state.freqMin;
        }
        this.state.audio.frequency.setValueAtTime(freqVal, this.props.audioContext.currentTime);
        this.setState({
            freqVal: freqVal,
            freqNum: freqVal
        });
    }

    handleFreqNumChange(event){
        if(isNaN(event.target.value)){
            return;
        }
        this.setState({
            freqNum: event.target.value
        })
    }

    handleFreqNumSubmit(){
        let temp = this.state.freqNum;
        if(temp > this.state.freqMax){
            temp=this.state.freqMax;
        }else if(temp < this.state.freqMin){
            temp=this.state.freqMin
        }
        this.setState({
            freqVal: temp,
            freqNum: temp
        })
    }

    componentDidMount(){
        this.props.createAudio(this.state.audio);
    }

    render(){
        let filterTypes=["lowpass", "highpass", "bandpass", "lowshelf", "highshelf", "peaking", "notch", "allpass"];
        return(
            <div className="filterDiv">
                <Selector id="filterSelector" values={filterTypes} handleClick={this.handleFilterType}/>
                <div id="filterGainDiv" className="tooltip">
                    <input id="filterGainRange" type="range" value={this.state.gainVal} min="0" max="1" step=".05" onChange={this.handleGainRangeChange}></input>
                    <input id="filterGainNumber" value={this.state.gainNum} type="text" onChange={this.handleGainNumChange} onKeyPress={event => {if(event.key == "Enter"){this.handleGainNumSubmit()}}}></input>
                    <span id="filterGainTip" className="tooltiptext">Filter Gain</span>
                </div>
                <div id="filterFreqDiv" className="tooltip">
                    <input id="filterFreqRange" type="range" value={this.state.freqVal} min="0" max="3000" step="5" onChange={this.handleFreqRangeChange}></input>
                    <input id="filterFreqNumber" value={this.state.freqNum} type="text" onChange={this.handleFreqNumChange} onKeyPress={event => {if(event.key == "Enter"){this.handleFreqNumSubmit()}}}></input>
                    <span id="filterFreqTip" className="tooltiptext">Filter Frequency</span>
                </div>

            </div>
        )
    }
}

class Output extends React.Component{
    constructor(props){
        super(props);

        this.state={
            gainNode: this.props.audioContext.createGain(),
            value: .5
        }
        this.handleOutput=this.handleOutput.bind(this);
        this.handleChange=this.handleChange.bind(this);
    }

    handleOutput(event){
        let largerDim = window.innerHeight > window.innerWidth ? window.innerHeight : window.innerWidth;
        let el = event.target.getBoundingClientRect();
        let x = el.x;
        let y = el.y;
        let bottom = el.bottom;
        let right = el.right;
        let xCenter = ((right - x) / 2 + x) - (largerDim * .04);
        let yCenter = ((bottom - y) / 2 + y) - (largerDim * .04);
        
        this.props.handleOutput({tomyKey: "Output",
                                 toLocation: {x: xCenter, y: yCenter},
                                 audio: this.state.gainNode});
    }
    
    handleChange(event){
        this.state.gainNode.gain.setValueAtTime(event.target.value, this.props.audioContext.currentTime);
        this.setState({
            value: event.target.value
        })
    }
        

    render(){
        this.state.gainNode.connect(this.props.audioContext.destination);
        return(
            <div id="outputDiv">
                <p>Output</p>
                <input id="gainSlider" value={this.state.value} type="range" min="0" max="1" step=".05" onChange={this.handleChange}></input>
                <div className="cordOuter"
                        onClick={this.handleOutput}>
                            <div className="cordInner" id={"Output" + "inputInner"}>
                            </div>
                    </div> 
            </div>
        )
    }
}

//patchcords with delete capability
class Cord extends React.Component{
    constructor(props){
        super(props);

        this.handleClick=this.handleClick.bind(this);
    }

    handleClick(){
        this.props.deleteCord(this.props.id);
    }

    render(){
        return(
            <line 
                x1={this.props.x1} 
                y1={this.props.y1} 
                x2={this.props.x2} 
                y2={this.props.y2}
                onClick={this.handleClick}></line>
        )
    }
}

//sidebar with buttons for creation
class SideButtons extends React.Component{
    constructor(props){
        super(props);
    }

    render(){
        return(
            <div id={this.props.id}>
                <MyButton name="Oscillator" handleClick={this.props.handleClick} inputOnly="true"/>
                <MyButton name="Gain" handleClick={this.props.handleClick} inputOnly="false"/>
                <MyButton name="Filter" handleClick={this.props.handleClick} inputOnly="false"/>
                <MyButton name="PeePee" handleClick={this.props.handleClick} inputOnly="false"/>
            </div>
        )
        
    }
}

//buttons in side area that create modules for the playspace
class MyButton extends React.Component{
    constructor(props){
        super(props);

        this.state={
            count: 0
        }

        this.handleClick=this.handleClick.bind(this);
    }

    handleClick(){
        this.props.handleClick(this.props.name + " " + this.state.count, this.props.name, this.props.inputOnly)
        this.setState((state) => ({
            count: state.count + 1
        }))
    }


    render(){
        return(
            <button className="addBtn" onClick={this.handleClick}>{this.props.name}</button>
        )
    }
}

class Selector extends React.Component{
    constructor(props){
        super(props);

        this.state={
            val: this.props.values[0]
        }

        this.handleClick=this.handleClick.bind(this);
    }

    handleClick(event){
        this.setState({
            val: event.target.innerHTML
        })
        this.props.handleClick(event.target.innerHTML);
    }

    render(){
        return(
            <div id={this.props.id} className="selectorDiv">
                <span>{this.state.val}</span>
                {this.props.values.map(el => {
                    return <div key={el} className="selectorVal" onClick={this.handleClick}>{el}</div>
                })}
            </div>
        )
    }
}


ReactDOM.render(<App />, document.getElementById("App"));

