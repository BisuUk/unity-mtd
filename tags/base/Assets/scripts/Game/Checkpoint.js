#pragma strict
#pragma downcast

var creditCapacityChange : int;
var isNewCreditCapacity : boolean;
var netView : NetworkView;

private var text : TextMesh;

function Awake()
{
   text = transform.Find("Text").GetComponent(TextMesh);
   text.transform.parent = null;
   text.text = ((isNewCreditCapacity) ? "" : "+") + creditCapacityChange.ToString();

   if (Network.isClient)
      collider.enabled = false;
}


function OnTriggerEnter(other : Collider)
{
   // A unit stop colliding with us, apply buff
   if (Network.isServer || Game.hostType == 0)
   {
      var unit : Unit = other.gameObject.GetComponent(Unit);
      if (unit && unit.unitType == 0)
      {
         collider.enabled = false;
         // Trigger capacity change
         Game.control.CreditCapacityChange(isNewCreditCapacity, creditCapacityChange);

         SetCaptured();
         if (Network.isServer)
            netView.RPC("SetCaptured", RPCMode.Others);
      }
   }
}

@RPC
function SetCaptured()
{
   SetColor(Utility.creditsTextColor);
}

function SetColor(c : Color)
{
   text.renderer.material.color = c;
   c.a = 0.5;
   SetChildrenColor(transform, c);
}

function SetChildrenColor(t : Transform, newColor : Color)
{
   if (t.renderer && t.renderer.material)
      t.renderer.material.color = newColor;
   for (var child : Transform in t)
      SetChildrenColor(child, newColor);
}
