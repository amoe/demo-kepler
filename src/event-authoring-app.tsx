import React, {useState, useReducer, useEffect} from 'react';
import {Layout, Row, Col} from 'antd';
import {ThemePanel} from './theme-panel';
import {SubjectPanel} from './subject-panel';
import {SCHEMA, EventTheme, FieldSpecification} from './schema';
import {Form, Input, Button, notification} from 'antd';
import {Store} from 'antd/lib/form/interface';
import {FormInstance} from 'antd/lib/form';
import {EventBlob, EntityCache} from './interfaces2';
import singletons from './singletons';
import {GetDistinctPilots} from './canned-statements';
import {reducer, ActionType} from './reducer';
const { Header, Footer, Sider, Content } = Layout;

function Field(props: FieldSpecification) {
    return <Form.Item label={props.label}
                      name={props.fieldName}><Input/></Form.Item>
}

const AVAILABLE_THEMES = [
    EventTheme.PERSON, EventTheme.FLIGHT, EventTheme.ORGANIZATION
];

function FormView(
    props: {
        fields: FieldSpecification[],
        onFinish: (values: Store) => void,
        form: FormInstance
    }
) {
    return (
        <Form onFinish={props.onFinish} form={props.form}>
          {props.fields.map(x => <Field key={x.fieldName} {...x}/>)}
          
          <Button htmlType="submit">Submit</Button>
        </Form>
    );
}

function SequenceView(props: {allEvents: any[]}) {
    return (
        <div>
        <h1>Sequence</h1>

        <ul>
          {props.allEvents.map((x, i) => <li key={i}>{JSON.stringify(x)}</li>)}
        </ul>
        </div>
    );
}

enum ViewState {
    FORM = 'form',
    SEQUENCE = 'sequence'
};


function emptyCache(): EntityCache {
    return {
        pilots: []
    }
}

const CACHE_FILLERS = [
    {key: 'pilots',
     statement: GetDistinctPilots}
];


export function EventAuthoringApp() {
    const [state, dispatch] = useReducer(reducer, {
        allEvents: [],
        entityCache: emptyCache()
    });
    const [selectedTheme, setSelectedTheme] = useState(EventTheme.PERSON);
    const [event, setEvent] = useState({});
    const [viewState, setViewState] = useState(ViewState.FORM);
    const [form] = Form.useForm();

    useEffect(() => {
        CACHE_FILLERS.forEach(({key, statement}) => {
            singletons.gateway.search(new statement()).then(
                ({records}) => {
                    dispatch({type: ActionType.SET_ENTITY_CACHE,
                              entityType: key,
                              payload: records.map(x => x.toObject())});
                }
            );
        });
    }, []);

    const fields: FieldSpecification[] = SCHEMA[selectedTheme];

    // FIXME type should be Store but not sure where defined?
    // Store is just string->any map anyway.
    function handleFinish(values: Store) {
        console.log("values are %o", values);
        setEvent(values);
        dispatch({type: ActionType.ADD_EVENT, event: values});
    }

    function handleThemeChange(value: any) {
        setSelectedTheme(value);
    }

    function handleCollapse() {
        if (viewState !== ViewState.FORM)
            throw new Error("bad transition");
            
        setViewState(ViewState.SEQUENCE);
    }

    function handleSave() {
        console.log("saving");


        const values = {} as EventBlob;
        for (let x of fields) {
            const {fieldName} = x;
            const y = form.getFieldValue(fieldName);
            console.log(y);
            values[fieldName] = y;
        }

        singletons.gateway.saveEvent(values).then(r => {
            notification.success({
                message: 'Success',
                description: 'Added event to database.'
            });
        });
        ;
    }

    return (
        <Layout>
          <Content>
            <Row>
              <Col span={12} offset={6}>
                <textarea value={JSON.stringify(state.entityCache)}></textarea>
                  
                  <ThemePanel onChange={handleThemeChange} 
                  onCollapse={handleCollapse}
                  onSave={handleSave}
                  availableThemes={AVAILABLE_THEMES}
                  collapseEnabled={viewState === ViewState.FORM}/>
                  <SubjectPanel />

                  {viewState === ViewState.FORM
                  ? <FormView fields={fields} onFinish={handleFinish} form={form}/>
                  : <SequenceView allEvents={state.allEvents}/>}
                  </Col>
                  </Row>
                  </Content>
                  </Layout>
    );
}

