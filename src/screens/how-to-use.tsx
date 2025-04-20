import { Container } from "../components/Container";
import { TabBar } from "../components/common/TabBar";

export default function HowToUseScreen() {
  return (
    <div className="h-screen flex flex-col">
      <Container className="flex-1 px-5 pb-24 md:px-0">
        <div className="flex flex-col items-center justify-center h-full w-full md:w-3/4 mx-auto px-5">
          <div className="">
            <p>
              Manga Devourer is designed to be fairly self-explanatory. You are
              able to read comics either remotely from a compatible server, or
              locally from your device once they have been imported.
            </p>
            <p className="mt-5">
              In remote mode, you can connect to a Manga Devourer server that
              you have installed by entering the relevant server into the
              connection field. You can also read from your Google Drive or
              Dropbox account. Numerous more providers will be coming over the
              next couple of months. Once connected to a server, you can either
              create a library; or select an existing library to load.
            </p>
            <p className="mt-5">
              From the remote library page, you have a number of options
              available. You can scan the library in order to detect changes,
              change how many are displayed per row, or filter the view by
              title, author or genre. You're also able to download a series to
              your local device by clicking the download icon on the series
              card.
            </p>
            <p className="mt-5">
              From the series page, you're able to select a file to read. Where
              available, the volume or chapter number will be displayed; along
              with your current page and how many pages are in the file in
              total.
            </p>
            <p className="mt-5">
              Now, you're finally on the read page. At the top right of the
              screen is a transparent button with the text "menu". Clicking on
              this will bring up the control menu. From this menu you can set
              the reading direction, the page mode (single or double) and the
              resize mode (fit to screen or full image). From here, you can also
              go back to the series screen.
            </p>
            <p className="mt-5">
              Bringing up the menu will also bring up the page controls at the
              bottom of the screen, allowing you to click "Next" and "Prev" in
              order to navigate through the file. You can also use the left and
              right arrow keys on your keyboard to navigate; or click on the
              left / right of the screen in order to switch between pages. Once
              you reach the end of a file, if the next file in the series is
              available - a quick link to this file will appear. When leaving a
              file, your current page is stored - so don't worry about losing
              your place.
            </p>
            <p className="mt-5">
              The way Manga Devourer works in remote mode is that it downloads
              an archive in full to your local device, and extracts the relevant
              images to a temporary folder to retrieve images from, before
              deleting the downloaded archive. Upon exiting the file or
              switching to a new one; the temporary files are deleted. This
              results in faster performance when switching between pages and
              greater device compatibility for the client.
            </p>
            <p className="mt-5">
              Local mode works the same way, only "import series" on the series
              page is replaced with "delete series".
            </p>
            <p className="mt-5">
              For upcoming features, or to suggest new ones; please visit the
              roadmap page.
            </p>
          </div>
          <div className="mt-5 w-full md:w-1/2">
            <a
              href="https://devourer.app"
              target="_blank"
              className="w-full block text-center bg-secondary text-white p-3 rounded-md text-xl font-semibold"
            >
              View roadmap
            </a>
          </div>
        </div>
      </Container>
      <TabBar />
    </div>
  );
}
