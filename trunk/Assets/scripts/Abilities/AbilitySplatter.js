#pragma strict
#pragma downcast

var color : Color;

private var decal : DS_Decals;
private var capturedUnit : UnitSimple;

function Init(hit : RaycastHit, newColor : Color)
{
   Init(hit.collider, hit.point, hit.normal, newColor);
}

function Init(hitCollider : Collider, hitPoint : Vector3, hitNormal : Vector3, newColor : Color)
{
   color = newColor;
   decal = Game.map.splatterDecalManager.SpawnDecal(hitCollider, hitPoint, hitNormal , 0, color);
   //transform.parent = hit.collider.transform;

   // Aligns collider with normal
   transform.rotation = Quaternion.LookRotation(hitNormal);
   transform.Rotate(Vector3(90,0,0));

}


function SetColor(newColor : Color)
{
   if (color != newColor)
   {
      color = newColor;
      if (decal)
         Game.map.splatterDecalManager.SetColor(decal, newColor, true);
      if (capturedUnit)
         capturedUnit.SetStickied(false);
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
         case Color.red:
            DoSpeed(unit);
            break;
         case Color.blue:
            DoStickied(unit, true);
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
            DoStickied(unit, false);
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
   //unit.Jump(5.0, 1.0);
   //unit.Jump((unit.transform.position+(unit.transform.forward*unit.actualSpeed*1.75f)), 5.0f, 1.0f);
   unit.InstantForce((transform.up*10.0f));
}

function DoSpeed(unit : UnitSimple)
{
   var buff : UnitBuff = new UnitBuff();
   buff.action = ActionType.ACTION_SPEED_CHANGE;
   buff.duration = 1.25;
   buff.magnitude = 2.0;
   unit.ApplyBuff(buff);
}

function DoStickied(unit : UnitSimple, sticky : boolean)
{
   if (capturedUnit == null && unit.isStickied == false)
   {
      unit.SetStickied(sticky);
      unit.transform.position = transform.position+(transform.up*(unit.controller.radius+0.1));
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
      capturedUnit.SetStickied(false);
   }
   if (decal && Game.map.splatterDecalManager)
      Game.map.splatterDecalManager.RemoveDecal(decal, true);
   Destroy(gameObject);
}