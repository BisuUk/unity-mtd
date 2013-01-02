#pragma strict
#pragma downcast

private var color : Color;

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
      // Copy material, projectors use 'shared' materials
      var projector : Projector = transform.FindChild("Projector").GetComponent(Projector);
      var newMat : Material = new Material(projector.material);
      newMat.SetColor("_TintColor", c);
      projector.material = newMat;
   }
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


function OnTriggerEnter(other : Collider)
{

   var unit : Unit = other.GetComponent(Unit);
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
         case Color.black:
            DoSpeed(unit);
            break;
         default:
            break;
      }
   }
}

function DoBounce(unit : Unit)
{
   var v : Vector3 = transform.position+(unit.transform.forward*20.0);
   unit.LeapTo(Utility.GetGroundAtPosition(v, 0));
}

function DoSpeed(unit : Unit)
{
   var effect : Effect = new Effect();
   effect.type = ActionType.ACTION_SPEED_CHANGE;
   effect.val = 2.0;
   effect.color = unit.actualColor;
   effect.interval = 0.0;
   effect.expireTime = Time.time+1.0;
   unit.ApplyBuff(0, effect, true);
}
