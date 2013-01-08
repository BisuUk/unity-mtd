#pragma strict
#pragma downcast

var color : Color;

private var decal : DS_Decals;
private var capturedUnit : UnitSimple;

function OnDestroy()
{
   if (capturedUnit)
      capturedUnit.SetStickied(false);
   if (decal && Game.map.splatterDecalManager)
      Game.map.splatterDecalManager.RemoveDecal(decal, true);
   Destroy(gameObject);
}

function Init(hit : RaycastHit, newColor : Color)
{
   color = newColor;
   decal = Game.map.splatterDecalManager.SpawnDecal(hit, 0, color);
}

function SetColor(newColor : Color)
{
   color = newColor;
   if (decal)
      Game.map.splatterDecalManager.SetColor(decal, newColor, true);
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
   UIControl.CurrentUI().SendMessage("OnHoverSplatter", this, SendMessageOptions.DontRequireReceiver);
}

function OnMouseDown()
{
   UIControl.CurrentUI().SendMessage("OnPressSplatter", this, SendMessageOptions.DontRequireReceiver);
}

function DoBounce(unit : UnitSimple)
{
   unit.jumpDieOnImpact = true;
   unit.Jump(5.0, 1.0);
}

function DoSpeed(unit : UnitSimple)
{
   var buff : UnitBuff = new UnitBuff();
   buff.action = ActionType.ACTION_SPEED_CHANGE;
   buff.duration = 1.0;
   buff.magnitude = 2.0;
   unit.ApplyBuff(buff);
}

function DoStickied(unit : UnitSimple, sticky : boolean)
{
   if (capturedUnit==null)
   {
      unit.SetStickied(sticky);
      capturedUnit = unit;
   }
}