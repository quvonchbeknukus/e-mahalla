import { useState } from "react";
import {
Modal,
ModalHeader,
ModalBody,
ModalFooter,
Button,
Form,
FormGroup,
Label,
Input,
Row,
Col
} from "reactstrap";

function WorkModal({open,setOpen}){

const toggle=()=>setOpen(!open);

const [mahalla,setMahalla]=useState("");
const [yonalish,setYonalish]=useState("");
const [sana,setSana]=useState("");

const [works,setWorks]=useState([
{text:"",images:[]}
]);

const mahallalar=[
"Bog'bon",
"Gulzor",
"Navbahor",
"Do'stlik"
];

const yonalishlar=[
"Profilaktika",
"Jinoyatchilik",
"Yoshlar",
"Ijtimoiy",
"Ayollar",
"Tadbirkorlik",
"Migratsiya",
"Ma'naviy",
"Boshqa"
];

const addWork=()=>{
setWorks([...works,{text:"",images:[]}]);
};

const updateText=(index,value)=>{
const newWorks=[...works];
newWorks[index].text=value;
setWorks(newWorks);
};

const updateImages=(index,files)=>{
const newWorks=[...works];
newWorks[index].images=[...files];
setWorks(newWorks);
};

const submitData=()=>{

const data={
mahalla,
yonalish,
sana,
ishlar:works
};

console.log(data);

setOpen(false);

};

return(

<Modal isOpen={open} toggle={toggle} size="lg">

<ModalHeader toggle={toggle}>
Qilingan ishlarni kiritish
</ModalHeader>

<ModalBody>

<Form>

<Row>

<Col md="4">
<FormGroup>
<Label>Mahalla</Label>
<Input
type="select"
value={mahalla}
onChange={(e)=>setMahalla(e.target.value)}
>

<option value="">Tanlang</option>

{mahallalar.map((m,i)=>(
<option key={i}>{m}</option>
))}

</Input>
</FormGroup>
</Col>

<Col md="4">
<FormGroup>
<Label>Yo'nalish</Label>
<Input
type="select"
value={yonalish}
onChange={(e)=>setYonalish(e.target.value)}
>

<option value="">Tanlang</option>

{yonalishlar.map((y,i)=>(
<option key={i}>{y}</option>
))}

</Input>
</FormGroup>
</Col>

<Col md="4">
<FormGroup>
<Label>Sana</Label>
<Input
type="date"
value={sana}
onChange={(e)=>setSana(e.target.value)}
/>
</FormGroup>
</Col>

</Row>

<hr/>

{works.map((item,index)=>(

<div key={index} className="mb-4">

<FormGroup>

<Label>Qilingan ish</Label>

<Input
type="textarea"
rows="3"
placeholder="Qilingan ishlarni yozing..."
value={item.text}
onChange={(e)=>updateText(index,e.target.value)}
/>

</FormGroup>

<FormGroup>

<Label>Rasmlar</Label>

<Input
type="file"
multiple
onChange={(e)=>updateImages(index,e.target.files)}
/>

</FormGroup>

</div>

))}

<Button
color="success"
onClick={addWork}
>
+ Yana ish qo'shish
</Button>

</Form>

</ModalBody>

<ModalFooter>

<Button color="secondary" onClick={toggle}>
Bekor qilish
</Button>

<Button color="primary" onClick={submitData}>
Yuborish
</Button>

</ModalFooter>

</Modal>

);

}

export default WorkModal;