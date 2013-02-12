#pragma strict
#pragma downcast

var color : Color;
@HideInInspector var capturedUnit : UnitSimple;

private var decal : DS_Decals;
private var pitchAngle : float;


static var dnum : int = 0;

function Init(hit : RaycastHit, newColor : Color)
{
   Init(hit.collider, hit.point, hit.normal, newColor);
}

function Init(hitCollider : Collider, hitPoint : Vector3, hitNormal : Vector3, newColor : Color)
{
   color = newColor;
   decal = Game.map.splatterDecalManager.SpawnDecal(hitCollider, hitPoint, hitNormal , 0, color);

   // Aligns collider with normal
   transform.rotation = Quaternion.LookRotation(hitNormal);
   transform.Rotate(Vector3(90,0,0));
   // Make sure we parent last
   transform.parent = hitCollider.transform;

   pitchAngle = Vector3.Angle(transform.up, Vector3.up);

   gameObject.name = "Splat"+dnum.ToString();
   dnum += 1;
}


function SetColor(newColor : Color)
{
   if (color != newColor)
   {
      color = newColor;
      if (decal)
         Game.map.splatterDecalManager.SetColor(decal, newColor, true);
      if (capturedUnit)
         capturedUnit.SetStatic(false);
   }
}


function OnTriggerStay(other : Collider)
{
   var unit : UnitSimple = other.GetComponent(UnitSimple);
   if (unit)
   {
      switch (color)
      {
         case Color.red:
            unit.isBoosted = true;
            break;
         default:
            break;
      }
   }
}

function OnTriggerEnter(other : Collider)
{
   var unit : UnitSimple = other.GetComponent(UnitSimple);
   if (unit)
   {
      switch (color)
      {
         case Utility.colorYellow:
            DoBounce(unit);
            break;
         case Color.blue:
            DoSticky(unit, true);
            break;
         default:
            break;
      }
   }
}

function OnTriggerExit(other : Collider)
{
   var unit : UnitSimple = other.GetComponent(UnitSimple);
   if (unit)
   {
      switch (color)
      {
         case Color.blue:
            DoSticky(unit, false);
            break;
         default:
            break;
      }
   }
}

function OnMouseEnter()
{
   UIControl.CurrentUI().SendMessage("OnHoverSplatterIn", this, SendMessageOptions.DontRequireReceiver);
}

function OnMouseExit()
{
   UIControl.CurrentUI().SendMessage("OnHoverSplatterOut", this, SendMessageOptions.DontRequireReceiver);
}

function OnMouseDown()
{
   UIControl.CurrentUI().SendMessage("OnPressSplatter", this, SendMessageOptions.DontRequireReceiver);
}

function DoBounce(unit : UnitSimple)
{
   // Give sideways angled bouncers a little more kick
   var force : float = (pitchAngle >= 45.0f) ? 2000.0f : 1500.0f;
   //Debug.Log("BOUNCE:"+unit.gameObject.name+" s="+gameObject.name+" v:"+unit.velocity.magnitude+" a="+unit.actualSpeed+" p="+unit.transform.position);
   unit.InstantForce((transform.up*force), true);
}

function DoSticky(unit : UnitSimple, sticky : boolean)
{
   if (capturedUnit == null && unit.isStatic == false)
   {
      unit.SetStatic(sticky);
      // Push unit out from sticky thing a bit, sometimes on vertical splats, when unstickied
      // the unit goes right through the collider if it's too close, weird, annoying.
      unit.transform.position = transform.position+(transform.up*(unit.controller.radius+0.1));
      //unit.transform.position = transform.position;
      
      unit.transform.parent = transform;
      capturedUnit = unit;
   }
}

function WashIn(seconds : float)
{
   Invoke("Wash", seconds);
}

function Wash()
{
   if (capturedUnit)
   {
      capturedUnit.transform.parent = null;
      capturedUnit.SetStatic(false);
   }
   if (decal && Game.map.splatterDecalManager)
      Game.map.splatterDecalManager.RemoveDecal(decal, true);
   Destroy(gameObject);
}