#pragma strict
#pragma downcast

var legalLocation : boolean = false;
var tower : Tower;
var isSelectionFor : Tower;

private var lastTrajectoryPos : Vector3;
private var nextTrajectoryTime : float;
private var shotFX : Transform;
var obstructionCount : int = 0;


function Awake()
{
   tower = gameObject.GetComponent(Tower);
   gameObject.tag = "";
}

function AttributesSet()
{
   tower.FOVMeshRender.enabled = (tower.attributePoints[AttributeType.RANGE] != isSelectionFor.attributePoints[AttributeType.RANGE]);
   tower.model.renderer.enabled = (tower.attributePoints[AttributeType.STRENGTH] != isSelectionFor.attributePoints[AttributeType.STRENGTH]);

   var c : Color = (obstructionCount==0) ? isSelectionFor.color : Color.gray;
   c.a = 0.5;

   tower.SetChildrenMaterialColor(tower.transform, tower.constructingMaterial, c, true);
   tower.FOVMeshRender.material.color = c;
   tower.FOVMeshRender.material.SetColor("_TintColor", c);
}

function SetSelectionFor(t : Tower)
{
   isSelectionFor = t;
   t.FOVMeshRender.enabled = true;
   tower.FOV.position = t.FOV.position ;
   tower.FOVCollider.transform.position = t.FOVCollider.transform.position;
   tower.isPlaced = true;
   tower.collider.enabled = true;
   tower.collider.isTrigger = true;
   tower.SendMessage("SetDefaultBehaviorEnabled", false); // remove default behavior
   tower.CopyAttributePoints(t);

   if (tower.character)
   {
      tower.character.animation.Play("idleRW");
      Invoke("StopIdle", 0.01);
   }
}

function StopIdle()
{
   tower.character.animation.Stop("idleRW");
}

function OnDestroy()
{
   if (isSelectionFor && isSelectionFor.FOVMeshRender)
      isSelectionFor.FOVMeshRender.enabled = false;
}


function OnTriggerEnter(other : Collider)
{
   // 9=OBSTRUCT
   if (other.gameObject.layer==9 && (other.gameObject != isSelectionFor.gameObject))
   {
      obstructionCount += 1;
      AttributesSet();
   }
}

function OnTriggerExit(other : Collider)
{
   // 9=OBSTRUCT
   if (other.gameObject.layer==9 && (other.gameObject != isSelectionFor.gameObject))
   {
      obstructionCount -= 1;
      AttributesSet();
   }
}