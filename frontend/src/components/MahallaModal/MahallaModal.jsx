import {
  Modal,
  ModalHeader,
  ModalBody,
} from "reactstrap";

import "./MahallaModal.css";

function MahallaModal({selectedMahalla,setSelectedMahalla}){

const data = [
{
date:"2026-03-10",
direction:"Profilaktika",
image:"https://picsum.photos/600/300",
text:"Mahallada profilaktik suhbatlar o'tkazildi."
},
{
date:"2026-03-12",
direction:"Yoshlar",
image:"https://picsum.photos/600/301",
text:"Yoshlar bilan sport musobaqasi tashkil qilindi."
}
];

return(

<Modal
isOpen={selectedMahalla !== null}
toggle={()=>setSelectedMahalla(null)}
size="xl"
>

<ModalHeader toggle={()=>setSelectedMahalla(null)}>

{selectedMahalla?.name}

</ModalHeader>

<ModalBody>

<div className="mahalla-info">

<p>{selectedMahalla?.description}</p>

</div>

<hr/>

{data.map((item,i)=>(

<div className="work-block" key={i}>

<div className="work-meta">

<span>{item.date}</span>
<span>{item.direction}</span>

</div>

<img
src={item.image}
alt=""
className="work-image"
/>

<p className="work-text">
{item.text}
</p>

</div>

))}

</ModalBody>

</Modal>

);

}

export default MahallaModal;