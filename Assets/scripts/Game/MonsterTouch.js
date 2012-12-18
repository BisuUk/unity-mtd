#pragma strict

var action : TouchActionsType;
var color : Color;
var magnitude : float;

function LateUpdate()
{
   // Jostle just a tiny bit so OnTriggerEnter fires
   // iTween doesn't trigger this automatically for some reason.
   transform.position.x += 0.001;
}

function OnTriggerEnter(other : Collider)
{
Debug.Log("TOUCHED MONSTER");
   var monster : Monster = other.GetComponent(Monster);
   if (monster)
   {

      switch (action)
      {
         case TouchActionsType.TOUCH_DAMAGE:
            //if (!Network.isClient)
            //   unit.Kill();
            break;

         case TouchActionsType.TOUCH_COLOR_CHANGE:
            var newColor : Color = Color.Lerp(monster.color, color, magnitude);
            monster.SetColor(newColor);
            break;

      }
   }
}