import React, { Component } from 'react';
import './App.css';
import { BrowserRouter as Router } from "react-router-dom";
import localforage from 'localforage'
import { ScaleLoader } from 'react-spinners';
import { MetaContext } from "./contexts/MetaContext.js";
import GlobalScene from "./components/GlobalScene.js";

class App extends Component {

  constructor() {
    super();
    this.state = {
        collapsed: true,
        metadataContext : {
           loading: true,
        }
    }
  }

  componentDidMount() {
    var that = this;
    localforage.config({
        name        : 'worldevents',
        version     : 1.0,
        storeName   : 'worldevents',
        description : 'worldevents'
    });

    localforage.ready().then(function() {
        that.fetchMetaData();
    }).catch(function (e) {
        console.log(e);
    });
  }

  fetchMetaData(){
      var metaData = {
        loading: false
      }
      this.setState({
        metadataContext: metaData
      });

  }

  render() {
    return (
      <MetaContext.Provider value={this.state.metadataContext}>
        <Router>
            {
              this.state.metadataContext.loading ?
              <div style={{
                position: 'absolute',
                top: 0,
                width: '100%',
                height: 350,
                textAlign: 'center',
                paddingTop: 150,
                paddingBottom: 30 }}>
                <ScaleLoader
                  color={'#FFF'}
                  loading={ true }
                  />
              </div>
              :
              <GlobalScene style={{height: '500', width: '100%'}}/>
            }
        </Router>
      </MetaContext.Provider>
    );
  }
}

export default App;
