#pragma strict
#pragma downcast

var tower : Tower;
var selectionFor : Tower;
var hasNewSettings : boolean = false;
var colorPulsateDuration : float = 0.3;

private var lastTrajectoryPos : Vector3;
private var nextTrajectoryTime : float;
private var shotFX : Transform;
private var colorPulsateValue : float;
var obstructionCount : int = 0;


function Awake()
{
   tower = gameObject.GetComponent(Tower);
   tower.isClickable = false;
   gameObject.tag = "";
   nextTrajectoryTime = Time.time;
}

function AttributesSet()
{
   tower.FOVMeshRender.enabled = (tower.attributePoints[AttributeType.RANGE] != selectionFor.attributePoints[AttributeType.RANGE]);
   tower.model.enabled = (tower.attributePoints[AttributeType.STRENGTH] != selectionFor.attributePoints[AttributeType.STRENGTH]);

   tower.legalLocation = (obstructionCount==0);
   var c : Color = (tower.legalLocation) ? selectionFor.color : Color.gray;
   c.a = colorPulsateValue;

   tower.SetChildrenMaterialColor(tower.transform, tower.selectionMaterial, c, true);
   tower.FOVMeshRender.material.color = c;
   tower.FOVMeshRender.material.SetColor("_TintColor", c);

   hasNewSettings = false;
   hasNewSettings = hasNewSettings || (tower.attributePoints[AttributeType.STRENGTH] != selectionFor.attributePoints[AttributeType.STRENGTH]);
   hasNewSettings = hasNewSettings || (tower.attributePoints[AttributeType.FIRERATE] != selectionFor.attributePoints[AttributeType.FIRERATE]);
   hasNewSettings = hasNewSettings || (tower.attributePoints[AttributeType.RANGE] != selectionFor.attributePoints[AttributeType.RANGE]);
}

function SetSelectionFor(t : Tower)
{
   if (t==null)
   {
      if (selectionFor)
         selectionFor.FOVMeshRender.enabled = false;
      selectionFor = null;
   }
   else
   {
      selectionFor = t;
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
}

function StopIdle()
{
   tower.character.animation.Stop("idleRW");
}

function Update()
{
   if (tower.trajectoryTracer)
   {
      // Shoots a tracer projectile to show path of ballistic projectile
      if (Time.time > nextTrajectoryTime)
      {
         nextTrajectoryTime = Time.time + 10.0;
         if (shotFX)
            Destroy(shotFX.gameObject);
         shotFX = Instantiate(tower.trajectoryTracer, transform.position, Quaternion.identity);
         var shotFXScr = shotFX.GetComponent(BallisticProjectile);
         shotFXScr.targetPos = tower.FOV.transform.position;
         shotFXScr.SetColor(tower.color);
         shotFXScr.Fire();
      }
   }

   // Pulsate color
   var t : float = Mathf.PingPong(Time.time, colorPulsateDuration) / colorPulsateDuration;
   colorPulsateValue = Mathf.Lerp(0.3, 0.8, t);
   if (selectionFor)
   {
      if (selectionFor.FOVMeshRender && selectionFor.FOVMeshRender.enabled)
         tower.FOVMeshRender.material.color.a = colorPulsateValue;
      if (tower.model && tower.model.material)
         tower.model.material.color.a = colorPulsateValue;
   }
}

function OnDestroy()
{
   if (shotFX)
      Destroy(shotFX.gameObject);
}

function OnTriggerEnter(other : Collider)
{
   // 9=OBSTRUCT
   if (selectionFor && other.gameObject.layer==9 && (other.gameObject != selectionFor.gameObject))
   {
      obstructionCount += 1;
      AttributesSet();
   }
}

function OnTriggerExit(other : Collider)
{
   // 9=OBSTRUCT
   if (selectionFor && other.gameObject.layer==9 && (other.gameObject != selectionFor.gameObject))
   {
      obstructionCount -= 1;
      AttributesSet();
   }
}