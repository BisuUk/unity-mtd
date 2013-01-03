#pragma strict
#pragma downcast

var projector : Projector;

private var color : Color;
private var mat : Material;

function Awake()
{
   // Copy material, projectors use 'shared' materials
   mat = new Material(projector.material);
   projector.material = mat;
}

function SetColor(newColor : Color)
{
   if (newColor == Color.black)
   {
      DoWash();
      Destroy(gameObject);
   }
   else
   {
      // Set color to be alpha'd out
      color = newColor;
      var c : Color = color;
      c.a = 0;
      mat.SetColor("_TintColor", c);
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
         default:
            break;
      }
   }
}

function OnMouseEnter()
{
   UIControl.CurrentUI().SendMessage("OnHoverSplatter", this, SendMessageOptions.DontRequireReceiver);
}

function DoWash()
{
   var range : float = 10.0;
   var objectArray : GameObject[] = GameObject.FindGameObjectsWithTag("WASHABLE");
   // Order by distance position
   var objectList : List.<GameObject> = objectArray.OrderBy(function(x){return (x.transform.position-transform.position).magnitude;}).ToList();

   for (var obj : GameObject in objectList)
   {
      if (obj == gameObject)
         continue;
      var affect : boolean = true;
      if (range > 0.0) // < 0 == infinite range
         affect = (obj.transform.position-transform.position).magnitude <= range;

      if (affect)
      {
         Destroy(obj, 0.01);
         Game.control.OnUseAbility();
         break;
      }
   }
}

function DoBounce(unit : UnitSimple)
{
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
