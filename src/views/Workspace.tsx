import React from 'react';
import { connect } from 'react-redux';
import actionCreators from '../action-creators';
import { FullStateTree, TilletDatum } from '../interfaces';
import { Select } from 'antd';
import axios from 'axios';
import { Button } from 'antd';
import singletons from '../singletons';
import { notification } from 'antd';
import { Typography, InputNumber, Divider } from 'antd';
import {isString} from 'lodash';

const { Title, Paragraph } = Typography;


function mapStateToProps(state: FullStateTree) {
    return {
    };
}

const mapDispatchToProps = {
};


interface AppProps {

}

// Actually a number but we treat it as a string always.
type TilletRecordId = string;


type GeoTuple = [number, number];   // long, lat


interface AppState {
    tilletData: TilletDatum[];
    coordinates: { [k: string]: GeoTuple };
    selectedOption: string;
    coordinateLongitude: number;
    coordinateLatitude: number;
    recordIdsByLz: { [k: string]: string };
    selectedLz: string;
}

class MyComponent extends React.Component<AppProps, AppState> {
    constructor(props: AppProps) {
        super(props);
        this.state = {
            tilletData: [],
            coordinates: {},
            recordIdsByLz: {},
            selectedOption: "",
            coordinateLongitude: 0, coordinateLatitude: 0,
            selectedLz: ""
        };
    }

    componentDidMount() {
        console.log("mount hook");
        axios.get("/sensitive/tillet_converted.json").then(r => {
            console.log("win", r.data);
            this.setState({ tilletData: r.data });
        }).catch(e => {
            console.log("lose");
        });;

        axios.get("/sensitive/parsed_sparse_coordinates.json").then(r => {
            console.log("got psc");
            this.setState({ coordinates: r.data });
        }).catch(e => {
            console.log("failed to get psc");
        });

        axios.get("/sensitive/lz_record_index.json").then(r => {
            console.log("got lzi");
            this.setState({ recordIdsByLz: r.data });
        }).catch(e => {
            console.log("failed to get psc");
        });

    }

    handleClick() {
        console.log("click handling");

        const recordId = this.state.selectedOption;
        const val = this.state.coordinates[recordId];

        if (val === undefined) {
            notification.error({
                message: 'Unknown coordinates',
                description: 'This record was not able to be scanned for coordinates.'
            });
            return;
        }

        const long = val[0];
        const lat = val[1];

        singletons.gateway.addLocation(long, lat).then(r => {
            notification.success({
                message: 'Success',
                description: 'Added location to database.'
            });
        });
    }

    handleChange(value: string) {
        this.setState({ selectedOption: value });
    }



    createLocationFromCoordinates(): void {
        console.log("creating loc", this.state);

        const long = this.state.coordinateLongitude;
        const lat = this.state.coordinateLatitude;

        singletons.gateway.addLocation(long, lat).then(r => {
            notification.success({
                message: 'Success',
                description: 'Added location to database.'
            });
        });

    }

    updateLatitude(value: string | number | undefined): void {
        if (isString(value)) throw new Error("inputnumber weirdness");

        if (value === undefined) throw new Error("fail");

        this.setState({ coordinateLatitude: value })
    }

    updateLongitude(value: string | number | undefined): void {
        if (isString(value)) throw new Error("inputnumber weirdness");
        if (value === undefined) throw new Error("fail");
        this.setState({ coordinateLongitude: value })
    }



    createLocationFromLz(): void {
        console.log("I would create from lz %o", this.state.selectedLz);

        const lz = this.state.selectedLz;
        const recordId = this.state.recordIdsByLz[lz];

        if (recordId === undefined) {
            throw new Error("can't happen because lz is selected from valid keys");
        }

        const val = this.state.coordinates[recordId];

        if (val === undefined) {
            notification.error({
                message: 'Unknown coordinates',
                description: 'This record was not able to be scanned for coordinates.'
            });
            return;
        }

        const long = val[0];
        const lat = val[1];

        singletons.gateway.addLocation(long, lat).then(r => {
            notification.success({
                message: 'Success',
                description: 'Added location to database.'
            });
        });
    }

    onLzChange(value: string): void {
        this.setState({ selectedLz: value });
    }

    render() {
        const derived = this.state.tilletData.map(
            r => <Select.Option key={r.record_id} value={r.record_id}>{r.record_id} — {r.landing_zone.join(' - ')}</Select.Option>
        );

        const sortedLz = Object.keys(this.state.recordIdsByLz);
        sortedLz.sort();

        return (
            <div>
                <Title level={2}>Location entry</Title>


                <Title level={3}>Select sheet location</Title>


                <Paragraph>These refer to record IDs from the spreadsheet compiled by Pierre Tillet.  Coordinate references within the rows have been pre-scanned.  Note that not all rows are able to be automatically interpreted.</Paragraph>


                <Select style={{ width: 800 }}
                    value={this.state.selectedOption}
                    onChange={(value: string) => this.handleChange(value)}
                    showSearch>
                    {derived}
                </Select>

                <Button onClick={() => this.handleClick()}>Create location</Button>



                <Divider />


                <Title level={3}>...or, enter coordinates:</Title>

                <Paragraph>Enter the literal coordinates of the landing zone location.</Paragraph>


                Latitude
              <InputNumber value={this.state.coordinateLatitude}
                    precision={6}
                    onChange={(v) => this.updateLatitude(v)}
                    style={{ width: 200 }}></InputNumber>

                Longitude
              <InputNumber value={this.state.coordinateLongitude}
                    precision={6}
                    style={{ width: 200 }}
                    onChange={(v) => this.updateLongitude(v)}></InputNumber>



                <Button onClick={() => this.createLocationFromCoordinates()}>Create location from coordinates</Button>
                <Divider />


                <Title level={3}>...or, choose by LZ:</Title>


                <Paragraph>Create a location by selecting from pre-scanned LZ names.</Paragraph>


                <Select style={{ width: 300 }}
                    value={this.state.selectedLz}
                    onChange={(value: string) => this.onLzChange(value)}
                    showSearch>
                    {
                        sortedLz.map(
                            (x, idx) => <Select.Option key={idx} value={x}>{x}</Select.Option>
                        )
                    }
                </Select>

                <Button onClick={() => this.createLocationFromLz()}>Create location from LZ name</Button>


            </div>
        );
    }
}


export default connect(mapStateToProps, mapDispatchToProps)(MyComponent);
